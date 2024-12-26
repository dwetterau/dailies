//
//  EntityCompletionModel.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//

import ConvexMobile
import SwiftUI

class EntityCompletionModel: ObservableObject {
    let entityId: String
    let timestamp: Int
    let numRequiredCompletions: Int

    @Published
    private var completions: Int = 0

    @Published
    public private(set) var isSaving: Bool = false

    init(entityId: String, numRequiredCompletions: Int) {
        self.entityId = entityId
        self.numRequiredCompletions = numRequiredCompletions
        timestamp = getCurrentTimestamp()
    }

    public var isComplete: Bool {
        completions >= numRequiredCompletions
    }

    public func logCompletion(completionCallback: @escaping () -> Void) {
        completions += 1
        if isComplete {
            saveCompletionEvent(completionCallback)
        }
    }

    public var completionStatusString: String {
        if completions >= numRequiredCompletions {
            return "Done"
        }
        return "\(completions)/\(numRequiredCompletions)"
    }

    private func saveCompletionEvent(_ completionCallback: @escaping () -> Void) {
        isSaving = true

        let timeRange = getTimeRangeForDate(getDateFromTimestamp(timestamp))
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
                            numCompletions: self.completions,
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
