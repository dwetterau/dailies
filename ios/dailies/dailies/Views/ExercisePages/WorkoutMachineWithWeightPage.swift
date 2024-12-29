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
    private let entityName: String
    private let onSave: () -> Void

    init(entityId: String, entityName: String, onSave: @escaping () -> Void = {}) {
        self.entityId = entityId
        self.entityName = entityName
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
        .navigationTitle("New workout")
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
            Section(header: Text(self.entityName)) {
                DatePicker(
                    "Date",
                    selection: $date,
                    in: ...Date(),
                    displayedComponents: .date
                )
            }
            Section(header: Text("Details")) {
                self.detailsSection(
                    weight: $weight,
                    numReps: $numReps,
                    numSets: $numSets
                )
            }
            if let mostRecentEvent = eventsListViewModel.mostRecentEvent {
                if case let .workoutMachineWithWeight(mostRecentDetails) = mostRecentEvent.details {
                    Section(header: Text("Previous details")) {
                        HStack {
                            Text("Date")
                            Spacer()
                            Text(getDateString(getDateFromTimestamp(mostRecentEvent.timestamp)))
                        }
                        self.detailsSection(
                            weight: Binding(get: { mostRecentDetails.weight }, set: { _ in }),
                            numReps: Binding(get: { mostRecentDetails.numReps }, set: { _ in }),
                            numSets: Binding(get: { mostRecentDetails.numSets }, set: { _ in }),
                            isDisabled: true
                        )
                    }
                }
            }
        }
    }

    func detailsSection(
        weight: Binding<Double?>,
        numReps: Binding<Int?>,
        numSets: Binding<Int?>,
        isDisabled: Bool = false
    ) -> some View {
        Group {
            HStack {
                Text("Weight")
                TextField("0", value: weight, format: .number)
                    .keyboardType(.decimalPad)
                    .disabled(isDisabled)
                    .multilineTextAlignment(.trailing)
                Text("lbs").foregroundColor(.gray)
            }
            HStack {
                Text("Repetitions")
                TextField("0", value: numReps, format: .number)
                    .keyboardType(.numberPad)
                    .disabled(isDisabled)
                    .multilineTextAlignment(.trailing)
            }
            HStack {
                Text("Sets")
                TextField("0", value: numSets, format: .number)
                    .keyboardType(.numberPad)
                    .disabled(isDisabled)
                    .multilineTextAlignment(.trailing)
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

#Preview {
    WorkoutMachineWithWeightPage(entityId: "", entityName: "Test name")
}
