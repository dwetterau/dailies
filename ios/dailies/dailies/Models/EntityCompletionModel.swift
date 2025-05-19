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
    let isUnsaved: Bool
}

private func getCompletionStatsFilename(entityId: String) -> String {
    return "completionStats_\(entityId).json"
}

class EntityCompletionModel: ObservableObject {
    @ObservedObject
    private var entityViewModel: EntityViewModel

    @Published
    private var completionStats: CompletionStats = .init(
        // We don't want the initial value to be saved, since it might overwrite an older (but still current)
        // value.
        timestamp: 0,
        numCompletions: 0,
        isUnsaved: true
    )

    @Published
    public private(set) var isSaving: Bool = false

    private var subscriptions = Set<AnyCancellable>()

    init(_ entityViewModel: EntityViewModel) {
        self.entityViewModel = entityViewModel

        let timeRange = getTimeRangeForDate(Date(), resetInterval: self.entityViewModel.resetInterval)
        if let loadedCompletionStats: CompletionStats = loadFromDisk(
            filename: getCompletionStatsFilename(entityId: self.entityViewModel.id),
            type: CompletionStats.self
        ) {
            if isInTimeRange(timeRange, loadedCompletionStats.timestamp) {
                print("Loaded completionStats from disk", loadedCompletionStats)
                completionStats = loadedCompletionStats
            } else {
                // TODO: We should try to save these for the previous day
                print("completion stats were too old, and ignored")
            }
        }

        Task {
            print("Calling events:getCurrentEvent \(self.entityViewModel.id)")
            client.subscribe(to: "events:getCurrentEvent", with: [
                "entityId": self.entityViewModel.id,
                "timeRange": [
                    "startTimestamp": timeRange.start,
                    "endTimestamp": timeRange.end,
                ],
            ], yielding: Event?.self)
                .handleEvents(receiveCompletion: logCompletionHandlers("EntityCompletionModel events:getCurrentEvent"))
                .replaceError(with: nil)
                .receive(on: DispatchQueue.main)
                .combineLatest($completionStats)
                .map { newCurrentEvent, currentCompletionStats in
                    if let eventDetails = newCurrentEvent?.details {
                        if case let .genericCompletion(completionDetails) = eventDetails {
                            let remoteTimestamp = newCurrentEvent!.timestamp
                            if remoteTimestamp > currentCompletionStats.timestamp ||
                                (remoteTimestamp == currentCompletionStats.timestamp && currentCompletionStats.isUnsaved)
                            {
                                return CompletionStats(
                                    timestamp: remoteTimestamp,
                                    numCompletions: completionDetails.numCompletions,
                                    isUnsaved: false
                                )
                            }
                        }
                    }
                    return currentCompletionStats
                }
                .assign(to: &$completionStats)
        }

        $completionStats.sink { newValue in
            // We want to save to disk only after we've saved to the server, since we don't
            // have any concept of retries yet.
            if newValue.isUnsaved {
                return
            }
            if isInTimeRange(
                getTimeRangeForDate(Date(), resetInterval: entityViewModel.resetInterval),
                newValue.timestamp
            ) {
                saveToDisk(
                    newValue,
                    filename: getCompletionStatsFilename(entityId: entityViewModel.id)
                )
            }
        }.store(in: &subscriptions)
    }

    public var isComplete: Bool {
        completionStats.numCompletions >= entityViewModel.numRequiredCompletions
    }

    public func logCompletion() {
        let newTimestamp = getCurrentTimestamp()
        let timeRange = getTimeRangeForDate(
            getDateFromTimestamp(newTimestamp),
            resetInterval: entityViewModel.resetInterval
        )
        var newCompletionStats = completionStats
        if isInTimeRange(timeRange, completionStats.timestamp) {
            if isComplete {
                print("ignoring additional completion press")
                return
            }
            newCompletionStats = CompletionStats(
                timestamp: newTimestamp,
                numCompletions: completionStats.numCompletions + 1,
                isUnsaved: true
            )
        } else {
            newCompletionStats = CompletionStats(
                timestamp: newTimestamp,
                numCompletions: 1,
                isUnsaved: true
            )
        }
        saveCompletionStats(newCompletionStats) {}
    }

    public func removeAllCompletions(_ completionCallback: @escaping () -> Void) {
        saveCompletionStats(
            // It's important to use a new timestamp, since we need this to be > than the previously stored
            // value to apply the update. This does mean you can reset the next day's events if you do so right
            // on a boundary.
            CompletionStats(timestamp: getCurrentTimestamp(), numCompletions: 0, isUnsaved: true),
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

    private func saveCompletionStats(_ completionStats: CompletionStats, completionCallback: @escaping () -> Void) {
        isSaving = true
        let prevCompletionStats = self.completionStats

        let timeRange = getTimeRangeForDate(
            getDateFromTimestamp(completionStats.timestamp),
            resetInterval: entityViewModel.resetInterval
        )
        Task {
            do {
                print("Calling events:upsertCurrentEvent")
                try await client.mutation("events:upsertCurrentEvent", with: [
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
            } catch {
                handleMutationError(error)
                // If we fail to save, reset the update so the user can try again.
                // It could have gone through, in which case we'll still jump forward to the right place.
                self.completionStats = prevCompletionStats
            }

            await MainActor.run {
                self.completionStats = completionStats
                self.isSaving = false
                completionCallback()
            }
        }
    }
}
