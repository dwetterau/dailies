//
//  EditEntryPage.swift
//  dailies
//
//  Created by David Wetterau on 12/15/24.
//

import ConvexMobile
import SwiftUI

struct EditEntryPage: View {
    @State private var date: Date = .init()
    @State private var weight: Double? = nil
    @State private var numReps: Int? = nil
    @State private var numSets: Int? = nil

    @Environment(\.dismiss) private var dismiss

    private let entityId: String
    private let eventId: String?

    init(entityId: String) {
        self.entityId = entityId
        eventId = nil
    }

    init(event: Event) {
        entityId = event.entityId
        eventId = event._id

        if let date = getDateFromString(event.date) {
            _date = State(initialValue: date)
        } else {
            print("unable to parse date: \(event.date)")
        }

        switch event.details {
        case let .workout(workoutDetails):
            _weight = State(initialValue: workoutDetails.weight)
            _numReps = State(initialValue: workoutDetails.numReps)
            _numSets = State(initialValue: workoutDetails.numSets)
        default:
            return
        }
    }

    var body: some View {
        Form {
            Section {
                DatePicker(
                    "Date",
                    selection: $date,
                    in: ...Date(),
                    displayedComponents: .date
                )
            }

            Section(header: Text("Workout details")) {
                TextField("Weight (lbs)", value: $weight, format: .number)
                    .keyboardType(.decimalPad)

                TextField("# Reps", value: $numReps, format: .number)
                    .keyboardType(.numberPad)

                TextField("# Sets", value: $numSets, format: .number)
                    .keyboardType(.numberPad)
            }
        }
        .navigationTitle("New event")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: handleSubmit) {
                    Text("Save")
                        .fontWeight(.bold)
                    // TODO: Support saving edits
                }.disabled(eventId != nil || weight == nil || numReps == nil || numSets == nil)
            }
        }
    }

    private func handleSubmit() {
        guard weight != nil, numReps != nil, numSets != nil else {
            // TODO: show some warning message about them being required?
            return
        }
        Task {
            do {
                try await client.mutation("events:create", with: [
                    "entityId": entityId,
                    "date": getStringFromDate(date),
                    "details": EventType.workout(
                        WorkoutDetails(weight: weight!, numReps: numReps!, numSets: numSets!, overrides: nil)
                    ),
                ])
            } catch let ClientError.ConvexError(data) {
                let errorMessage = try! JSONDecoder().decode(String.self, from: Data(data.utf8))
                print(errorMessage)
                return
            } catch {
                print("An unknown error occurred: \(error)")
                return
            }
            // TODO: Use something like AlertToast to confirm that it was created successfully
            dismiss()
        }
    }
}
