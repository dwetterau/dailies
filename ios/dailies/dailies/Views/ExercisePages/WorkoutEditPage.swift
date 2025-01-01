//
// WorkoutEditPage.swift
//  dailies
//
//  Created by David Wetterau on 12/15/24.
//

import ConvexMobile
import SwiftUI

func getHoursMinutesSeconds(forDurationSeconds durationSeconds: Double) -> (hours: Int, minutes: Int, seconds: Int) {
    let hours = Int(durationSeconds / 3600)
    let minutes = Int((durationSeconds - Double(hours) * 3600) / 60)
    let seconds = Int(durationSeconds - Double(hours) * 3600 - Double(minutes) * 60)

    return (hours, minutes, seconds)
}

struct WorkoutEditPage: View {
    @StateObject private var eventsListViewModel: EventsListViewModel
    @State private var initialStateLoaded = false

    @State private var eventId: String? = nil
    @State private var date: Date = .init()
    @State private var weight: Double? = nil
    @State private var numReps: Int? = nil
    @State private var numSets: Int? = nil

    @State private var hours: Int = 0
    @State private var minutes: Int = 0
    @State private var seconds: Int = 0

    @State private var durationSeconds: Double? = nil
    @State private var distance: Double? = nil

    @Environment(\.dismiss) private var dismiss

    private let entityId: String
    private let entityName: String
    private let includedEventFields: Set<String>
    private let onSave: () -> Void

    init(
        entityId: String,
        entityName: String,
        includedEventFields: [String],
        resetInterval: ResetInterval,
        onSave: @escaping () -> Void = {}
    ) {
        self.entityId = entityId
        self.entityName = entityName
        self.includedEventFields = Set(includedEventFields)
        self.onSave = onSave

        _eventsListViewModel = StateObject(wrappedValue: EventsListViewModel(entityId: entityId, resetInterval: resetInterval))
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

                            // TODO: also set hours, minutes, and seconds

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

                                // TODO: also set hours, minutes, and seconds

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
                isAnyRequiredFieldUnset = isAnyRequiredFieldUnset || (hours == 0 && minutes == 0 && seconds == 0)
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

    @ViewBuilder
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
                    hours: $hours,
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
                            hours: Binding(get: { getHoursMinutesSeconds(forDurationSeconds: mostRecentEvent.durationSeconds).hours }, set: { _ in }),
                            distance: Binding(get: { mostRecentDetails.distance }, set: { _ in }),
                            isDisabled: true
                        )
                    }
                }
            }
        }
    }

    @ViewBuilder
    func detailsSection(
        weight: Binding<Double?>,
        numReps: Binding<Int?>,
        numSets: Binding<Int?>,
        hours _: Binding<Int>,
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
                Text("what")
                // self.durationPicker(hours: hours, minutes: minutes, seconds: seconds)
            }
        }
    }

    @ViewBuilder
    func durationPicker(
        hours: Binding<Int>,
        minutes: Binding<Int>,
        seconds: Binding<Int>,
        isDisabled: Bool
    ) -> some View {
        HStack {
            Text("Duration")
            Spacer()
            Menu {
                Picker("Hours", selection: hours) {
                    ForEach(0 ..< 24) { hour in Text("\(hour)").tag(hour)
                    }
                }
            }
            label: {
                Text("\(hours.wrappedValue)")
                    .frame(minWidth: 15)
                    .foregroundColor(.primary)
            }.disabled(isDisabled)
            Text("hr")

            Menu {
                Picker("Minutes", selection: minutes) {
                    ForEach(0 ..< 60) { minute in
                        Text("\(minute)").tag(minute)
                    }
                }
            } label: {
                Text("\(minutes.wrappedValue)")
                    .frame(minWidth: 15)
                    .foregroundColor(.primary)
            }.disabled(isDisabled)

            Text("min")

            Menu {
                Picker("Seconds", selection: seconds) {
                    ForEach(0 ..< 60) { second in
                        Text("\(String(format: "%02d", second))").tag(second)
                    }
                }
            } label: {
                Text("\(String(format: "%02d", seconds.wrappedValue))")
                    .frame(minWidth: 30)
                    .foregroundColor(.primary)
            }.disabled(isDisabled)

            Text("sec")
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
    WorkoutEditPage(
        entityId: "",
        entityName: "Test name",
        includedEventFields: ["distance", "durationSeconds"],
        resetInterval: .daily
    )
}
