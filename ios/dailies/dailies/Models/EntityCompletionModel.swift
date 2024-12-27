//
//  EntityCompletionModel.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//

import Combine
import ConvexMobile
import SwiftUI

struct CompletionStats: Codable {
    let timestamp: Int
    let numCompletions: Int
}

private func getCompletionStatsFilename(entityId: String) -> String {
    return "completionStats_\(entityId).json"
}

class EntityCompletionModel: ObservableObject {
    @ObservedObject
    private var entityViewModel: EntityViewModel

    @Published
    private var completionStats: CompletionStats = .init(
        timestamp: getCurrentTimestamp(),
        numCompletions: 0
    )

    @Published
    public private(set) var isSaving: Bool = false

    // Used to stay subscribed to the query for cards
    private var cancellables = Set<AnyCancellable>()

    init(_ entityViewModel: EntityViewModel) {
        self.entityViewModel = entityViewModel

        let timeRange = getTimeRangeForDate(Date())
        if let loadedCompletionStats: CompletionStats = loadFromDisk(
            filename: getCompletionStatsFilename(entityId: self.entityViewModel.id),
            type: CompletionStats.self
        ) {
            if isInTimeRange(timeRange, loadedCompletionStats.timestamp) {
                print("Loaded completionStats from disk", loadedCompletionStats)
                completionStats = loadedCompletionStats
            } else {
                // TODO: Should we try to save these too?
                print("completion stats were too old, and ignored")
            }
        }

        Task {
            client.subscribe(to: "events:getCurrentDayEvent", with: [
                "entityId": self.entityViewModel.id,
                "timeRange": [
                    "startTimestamp": timeRange.start,
                    "endTimestamp": timeRange.end,
                ],
            ], yielding: Event?.self)
                .handleEvents(receiveCompletion: logHandlers("EntityCompletionModel events:getCurrentDayEvent"))
                .replaceError(with: nil)
                .receive(on: DispatchQueue.main)
                .combineLatest($completionStats)
                .map { newCurrentEvent, currentCompletionStats in
                    if let eventDetails = newCurrentEvent?.details {
                        if case let .genericCompletion(completionDetails) = eventDetails {
                            let remoteTimestamp = newCurrentEvent!.timestamp
                            if remoteTimestamp > currentCompletionStats.timestamp {
                                return CompletionStats(
                                    timestamp: remoteTimestamp,
                                    numCompletions: completionDetails.numCompletions
                                )
                            }
                        }
                    }
                    return currentCompletionStats
                }
                .assign(to: &$completionStats)
        }

        $completionStats.sink { newValue in
            saveToDisk(
                newValue,
                filename: getCompletionStatsFilename(entityId: entityViewModel.id)
            )
        }.store(in: &cancellables)
    }

    public var isComplete: Bool {
        completionStats.numCompletions >= entityViewModel.numRequiredCompletions
    }

    public func logCompletion() {
        let newTimestamp = getCurrentTimestamp()
        let timeRange = getTimeRangeForDate(getDateFromTimestamp(newTimestamp))
        if isInTimeRange(timeRange, completionStats.timestamp) {
            if isComplete {
                print("ignoring additional completion press")
                return
            }
            completionStats = CompletionStats(
                timestamp: newTimestamp,
                numCompletions: completionStats.numCompletions + 1
            )
        } else {
            completionStats = CompletionStats(
                timestamp: newTimestamp,
                numCompletions: 1
            )
        }
        saveCurrentCompletionEvent()
    }

    public func removeAllCompletions(_ completionCallback: @escaping () -> Void) {
        saveCompletionStats(
            // It's important to use a new timestamp, since we need this to be > than the previously stored
            // value to apply the update. This does mean you can reset the next day's events if you do so right
            // on a boundary.
            CompletionStats(timestamp: getCurrentTimestamp(), numCompletions: 0),
            completionCallback: completionCallback
        )
    }

    public var completionRatio: CGFloat {
        if isComplete {
            return 1
        }
        if entityViewModel.numRequiredCompletions == 0 {
            return 0
        }
        return CGFloat(completionStats.numCompletions) / CGFloat(entityViewModel.numRequiredCompletions)
    }

    private func saveCurrentCompletionEvent() {
        saveCompletionStats(completionStats, completionCallback: {})
    }

    private func saveCompletionStats(_ completionStats: CompletionStats, completionCallback: @escaping () -> Void) {
        isSaving = true

        let timeRange = getTimeRangeForDate(getDateFromTimestamp(completionStats.timestamp))
        Task {
            do {
                try await client.mutation("events:upsertDayEvent", with: [
                    "entityId": entityViewModel.id,
                    "timeRange": [
                        "startTimestamp": timeRange.start,
                        "endTimestamp": timeRange.end,
                    ],
                    "timestamp": Float64(completionStats.timestamp),
                    "details": EventType.genericCompletion(
                        GenericCompletionDetails(
                            numCompletions: completionStats.numCompletions,
                            numRequiredCompletions: entityViewModel.numRequiredCompletions
                        )
                    ),
                ])
            } catch let ClientError.ConvexError(data) {
                let errorMessage = try! JSONDecoder().decode(String.self, from: Data(data.utf8))
                print(errorMessage)
            } catch {
                print("An unknown error occurred: \(error)")
            }

            await MainActor.run {
                self.isSaving = false
                completionCallback()
            }
        }
    }
}
