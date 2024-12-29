//
//  WorkoutMachineWithWeightPage.swift
//  dailies
//
//  Created by David Wetterau on 12/15/24.
//

import ConvexMobile
import SwiftUI

struct WorkoutMachineWithWeightPage: View {
    @StateObject private var eventsListViewModel: EventsListViewModel
    @State private var initialStateLoaded = false

    @State private var eventId: String? = nil
    @State private var date: Date = .init()
    @State private var weight: Double? = nil
    @State private var numReps: Int? = nil
    @State private var numSets: Int? = nil

    @Environment(\.dismiss) private var dismiss

    private let entityId: String
    private let onSave: () -> Void

    init(entityId: String, onSave: @escaping () -> Void = {}) {
        self.entityId = entityId
        self.onSave = onSave

        _eventsListViewModel = StateObject(wrappedValue: EventsListViewModel(entityId: entityId))
    }

    var body: some View {
        VStack {
            if !initialStateLoaded {
                ProgressView()
            } else {
                self.editForm()
                // TODO: Also show the most recent event
            }
        }.task {
            for await isLoaded in eventsListViewModel.$loaded.values {
                if isLoaded {
                    if let currentEvent = eventsListViewModel.currentEvent {
                        if case let .workoutMachineWithWeight(workoutDetails) = currentEvent.details {
                            eventId = currentEvent.entityId
                            weight = workoutDetails.weight
                            numReps = workoutDetails.numReps
                            numSets = workoutDetails.numSets
                        }
                    }
                    self.initialStateLoaded = true
                    return
                }
            }
        }
        // TODO: Better title
        .navigationTitle("New event")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: handleSubmit) {
                    Text("Save")
                        .fontWeight(.bold)
                    // TODO: Support saving edits - I think it needs a new endpoint
                }.disabled(eventId != nil || weight == nil || numReps == nil || numSets == nil)
            }
        }
    }

    private func editForm() -> some View {
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
                    "timestamp": Float64(getTimestampFromDate(date)),
                    "details": EventType.workoutMachineWithWeight(
                        WorkoutMachineWithWeightDetails(weight: weight!, numReps: numReps!, numSets: numSets!, overrides: nil)
                    ),
                ])
                onSave()
                dismiss()
            } catch let ClientError.ConvexError(data) {
                let errorMessage = try! JSONDecoder().decode(String.self, from: Data(data.utf8))
                print(errorMessage)
                return
            } catch {
                print("An unknown error occurred: \(error)")
                return
            }
        }
    }
}
