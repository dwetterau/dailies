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
    private let entityId: String
    private let numRequiredCompletions: Int

    @Published
    private var completionStats: CompletionStats = .init(
        timestamp: getCurrentTimestamp(),
        numCompletions: 0
    )

    @Published
    public private(set) var isSaving: Bool = false

    // Used to stay subscribed to the query for cards
    private var cancellables = Set<AnyCancellable>()

    init(entityId: String, numRequiredCompletions: Int) {
        self.entityId = entityId
        self.numRequiredCompletions = numRequiredCompletions

        let timestamp = getCurrentTimestamp()
        let timeRange = getTimeRangeForDate(getDateFromTimestamp(timestamp))
        if let loadedCompletionStats: CompletionStats = loadFromDisk(filename: getCompletionStatsFilename(entityId: entityId), type: CompletionStats.self) {
            if isInTimeRange(timeRange, loadedCompletionStats.timestamp) {
                print("Loaded completionStats from disk")
                completionStats = loadedCompletionStats
            } else {
                // TODO: Should we try to save these too?
                print("completion stats were too old, and ignored")
            }
        }

        Task {
            client.subscribe(to: "events:getCurrentDayEvent", with: [
                "entityId": entityId,
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
                            return CompletionStats(
                                timestamp: newCurrentEvent!.timestamp,
                                numCompletions: max(currentCompletionStats.numCompletions, completionDetails.numCompletions)
                            )
                        }
                    }
                    return currentCompletionStats
                }
                .assign(to: &$completionStats)
        }

        $completionStats.sink { newValue in
            saveToDisk(newValue, filename: getCompletionStatsFilename(entityId: entityId))
        }.store(in: &cancellables)
    }

    public var isComplete: Bool {
        completionStats.numCompletions >= numRequiredCompletions
    }

    public func logCompletion(completionCallback: @escaping () -> Void) {
        let timeRange = getTimeRangeForDate(Date())
        if isInTimeRange(timeRange, completionStats.timestamp) {
            completionStats = CompletionStats(
                timestamp: completionStats.timestamp,
                numCompletions: completionStats.numCompletions + 1
            )
        } else {
            completionStats = CompletionStats(
                timestamp: getCurrentTimestamp(),
                numCompletions: 1
            )
        }
        saveCompletionEvent(completionCallback)
    }

    public var completionStatusString: String {
        if completionStats.numCompletions >= numRequiredCompletions {
            return "Done"
        }
        return "\(completionStats.numCompletions)/\(numRequiredCompletions)"
    }

    private func saveCompletionEvent(_ completionCallback: @escaping () -> Void) {
        isSaving = true

        let timeRange = getTimeRangeForDate(getDateFromTimestamp(completionStats.timestamp))
        Task {
            do {
                try await client.mutation("events:upsertDayEvent", with: [
                    "entityId": self.entityId,
                    "timeRange": [
                        "startTimestamp": timeRange.start,
                        "endTimestamp": timeRange.end,
                    ],
                    "details": EventType.genericCompletion(
                        GenericCompletionDetails(
                            numCompletions: self.completionStats.numCompletions,
                            numRequiredCompletions: self.numRequiredCompletions
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
