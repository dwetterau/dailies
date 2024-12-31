//
// WorkoutEditPage.swift
//  dailies
//
//  Created by David Wetterau on 12/15/24.
//

import ConvexMobile
import SwiftUI

struct WorkoutEditPage: View {
    @StateObject private var eventsListViewModel: EventsListViewModel
    @State private var initialStateLoaded = false

    @State private var eventId: String? = nil
    @State private var date: Date = .init()
    @State private var weight: Double? = nil
    @State private var numReps: Int? = nil
    @State private var numSets: Int? = nil
    @State private var durationSeconds: Double? = nil
    @State private var distance: Double? = nil

    @Environment(\.dismiss) private var dismiss

    private let entityId: String
    private let entityName: String
    private let includedEventFields: Set<String>
    private let onSave: () -> Void

    init(entityId: String, entityName: String, includedEventFields: [String], onSave: @escaping () -> Void = {}) {
        self.entityId = entityId
        self.entityName = entityName
        self.includedEventFields = Set(includedEventFields)
        self.onSave = onSave

        _eventsListViewModel = StateObject(wrappedValue: EventsListViewModel(entityId: entityId))
    }

    var body: some View {
        VStack {
            if !initialStateLoaded {
                ProgressView()
            } else {
                self.editForm()
            }
        }.task {
            for await isLoaded in eventsListViewModel.$loaded.values {
                if isLoaded {
                    if let currentEvent = eventsListViewModel.currentEvent {
                        if case let .workout(workoutDetails) = currentEvent.details {
                            eventId = currentEvent._id
                            weight = workoutDetails.weight
                            numReps = workoutDetails.numReps
                            numSets = workoutDetails.numSets
                            durationSeconds = workoutDetails.durationSeconds
                            distance = workoutDetails.distance
                        }
                    }
                    // If there isn't a current event but there is a most recent event - pre-fill the
                    // details based off the previous event (these are also shown below).
                    if eventId == nil {
                        if let mostRecentEvent = eventsListViewModel.mostRecentEvent {
                            if case let .workout(workoutDetails) = mostRecentEvent.details {
                                weight = workoutDetails.weight
                                numReps = workoutDetails.numReps
                                numSets = workoutDetails.numSets
                                durationSeconds = workoutDetails.durationSeconds
                                distance = workoutDetails.distance
                            }
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
                }.disabled(isAnyRequiredFieldUnset())
            }
        }
    }

    func isAnyRequiredFieldUnset() -> Bool {
        var isAnyRequiredFieldUnset = false
        for field in includedEventFields {
            if field == "weight" {
                isAnyRequiredFieldUnset = isAnyRequiredFieldUnset || weight == nil
            }
            if field == "numReps" {
                isAnyRequiredFieldUnset = isAnyRequiredFieldUnset || numReps == nil
            }
            if field == "numSets" {
                isAnyRequiredFieldUnset = isAnyRequiredFieldUnset || numSets == nil
            }
            if field == "durationSeconds" {
                isAnyRequiredFieldUnset = isAnyRequiredFieldUnset || durationSeconds == nil
            }
            if field == "distance" {
                isAnyRequiredFieldUnset = isAnyRequiredFieldUnset || distance == nil
            }
        }
        return isAnyRequiredFieldUnset
    }

    func isFieldRequired(fieldName: String) -> Bool {
        includedEventFields.contains(fieldName)
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
                    numSets: $numSets,
                    durationSeconds: $durationSeconds,
                    distance: $distance
                )
            }
            if let mostRecentEvent = eventsListViewModel.mostRecentEvent {
                if case let .workout(mostRecentDetails) = mostRecentEvent.details {
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
                            durationSeconds: Binding(get: { mostRecentDetails.durationSeconds }, set: { _ in }),
                            distance: Binding(get: { mostRecentDetails.distance }, set: { _ in }),
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
        durationSeconds: Binding<Double?>,
        distance: Binding<Double?>,
        isDisabled: Bool = false
    ) -> some View {
        Group {
            if isFieldRequired(fieldName: "weight") {
                HStack {
                    Text("Weight")
                    TextField("0", value: weight, format: .number)
                        .keyboardType(.decimalPad)
                        .disabled(isDisabled)
                        .multilineTextAlignment(.trailing)
                    Text("lbs").foregroundColor(.gray)
                }
            }
            if isFieldRequired(fieldName: "numReps") {
                HStack {
                    Text("Repetitions")
                    TextField("0", value: numReps, format: .number)
                        .keyboardType(.numberPad)
                        .disabled(isDisabled)
                        .multilineTextAlignment(.trailing)
                }
            }
            if isFieldRequired(fieldName: "numSets") {
                HStack {
                    Text("Sets")
                    TextField("0", value: numSets, format: .number)
                        .keyboardType(.numberPad)
                        .disabled(isDisabled)
                        .multilineTextAlignment(.trailing)
                }
            }
            if isFieldRequired(fieldName: "distance") {
                HStack {
                    Text("Distance")
                    TextField("0", value: distance, format: .number)
                        .keyboardType(.decimalPad)
                        .disabled(isDisabled)
                        .multilineTextAlignment(.trailing)
                    Text("mi").foregroundColor(.gray)
                }
            }
            if isFieldRequired(fieldName: "durationSeconds") {
                // TODO: see if there is a better duration picker
                HStack {
                    Text("Duration")
                    TextField("0", value: durationSeconds, format: .number)
                        .keyboardType(.numberPad)
                        .disabled(isDisabled)
                        .multilineTextAlignment(.trailing)
                }
            }
        }
    }

    private func handleSubmit() {
        if isAnyRequiredFieldUnset() {
            print("WARN: Not saving new event, missing required field")
            return
        }
        Task {
            do {
                let newWorkoutDetails = EventType.workout(
                    WorkoutDetails(
                        weight: weight,
                        numReps: numReps,
                        numSets: numSets,
                        durationSeconds: durationSeconds,
                        distance: distance,
                        weightOverrides: nil
                    )
                )
                if eventId == nil {
                    try await client.mutation("events:create", with: [
                        "entityId": entityId,
                        "timestamp": Float64(getTimestampFromDate(date)),
                        "details": newWorkoutDetails,
                    ])
                } else {
                    try await client.mutation("events:update", with: [
                        "id": eventId!,
                        "details": newWorkoutDetails,
                    ])
                }
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
    WorkoutEditPage(entityId: "", entityName: "Test name", includedEventFields: ["distance", "durationSeconds"])
}
