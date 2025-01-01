//
//  WorkoutDetailsForm.swift
//  dailies
//
//  Created by David Wetterau on 1/1/25.
//

import SwiftUI

func getHoursMinutesSeconds(forDurationSeconds durationSeconds: Double) -> (hours: Int, minutes: Int, seconds: Int) {
    let hours = Int(durationSeconds / 3600)
    let minutes = Int((durationSeconds - Double(hours) * 3600) / 60)
    let seconds = Int(durationSeconds - Double(hours) * 3600 - Double(minutes) * 60)

    return (hours, minutes, seconds)
}

func getDurationSeconds(forHoursMinutesSeconds input: (hours: Int, minutes: Int, seconds: Int)) -> Double {
    return Double(input.hours * 3600 + input.minutes * 60 + input.seconds)
}

struct WorkoutDetailsForm: View {
    let weight: Binding<Double?>
    let numReps: Binding<Int?>
    let numSets: Binding<Int?>
    let durationSeconds: Binding<Double?>
    let distance: Binding<Double?>
    let isDisabled: Bool
    let isFieldRequired: (_ fieldName: String) -> Bool

    @State private var hours: Int = 0
    @State private var minutes: Int = 0
    @State private var seconds: Int = 0
    @State private var isInitialized: Bool = false
    
    init(weight: Binding<Double?>, numReps: Binding<Int?>, numSets: Binding<Int?>, durationSeconds: Binding<Double?>, distance: Binding<Double?>, isDisabled: Bool, isFieldRequired: @escaping (_: String) -> Bool) {
        self.weight = weight
        self.numReps = numReps
        self.numSets = numSets
        self.durationSeconds = durationSeconds
        self.distance = distance
        self.isDisabled = isDisabled
        self.isFieldRequired = isFieldRequired
    }
    
    private func initializeHoursMinutesSeconds() {
        if (isInitialized || durationSeconds.wrappedValue == nil) {
            return
        }
        self.isInitialized = true
        let (hours, minutes, seconds) = getHoursMinutesSeconds(forDurationSeconds: durationSeconds.wrappedValue!)
        self.hours = hours
        self.minutes = minutes
        self.seconds = seconds
    }

    private func updateDurationSeconds() {
        durationSeconds.wrappedValue = getDurationSeconds(forHoursMinutesSeconds: (hours, minutes, seconds))
    }

    var body: some View {
        if isFieldRequired("weight") {
            HStack {
                Text("Weight")
                TextField("0", value: weight, format: .number)
                    .keyboardType(.decimalPad)
                    .disabled(isDisabled)
                    .multilineTextAlignment(.trailing)
                Text("lbs").foregroundColor(.gray)
            }
        }
        if isFieldRequired("numReps") {
            HStack {
                Text("Repetitions")
                TextField("0", value: numReps, format: .number)
                    .keyboardType(.numberPad)
                    .disabled(isDisabled)
                    .multilineTextAlignment(.trailing)
            }
        }
        if isFieldRequired("numSets") {
            HStack {
                Text("Sets")
                TextField("0", value: numSets, format: .number)
                    .keyboardType(.numberPad)
                    .disabled(isDisabled)
                    .multilineTextAlignment(.trailing)
            }
        }
        if isFieldRequired("distance") {
            HStack {
                Text("Distance")
                TextField("0", value: distance, format: .number)
                    .keyboardType(.decimalPad)
                    .disabled(isDisabled)
                    .multilineTextAlignment(.trailing)
                Text("mi").foregroundColor(.gray)
            }
        }
        if isFieldRequired("durationSeconds") {
            durationPicker()
        }
    }

    @ViewBuilder
    func durationPicker() -> some View {
        HStack {
            Text("Duration")
            Spacer()
            Menu {
                Picker("Hours", selection: $hours) {
                    ForEach(0 ..< 24) { hour in
                        Text("\(hour)").tag(hour)
                    }
                }
            }
            label: {
                Text("\(hours)")
                    .frame(minWidth: 15)
                    .foregroundColor(.primary)
            }.disabled(isDisabled)
            Text("hr")

            Menu {
                Picker("Minutes", selection: $minutes) {
                    ForEach(0 ..< 60) { minute in
                        Text("\(minute)").tag(minute)
                    }
                }
            } label: {
                Text("\(minutes)")
                    .frame(minWidth: 15)
                    .foregroundColor(.primary)
            }.disabled(isDisabled)

            Text("min")

            Menu {
                Picker("Seconds", selection: $seconds) {
                    ForEach(0 ..< 60) { second in
                        Text("\(String(format: "%02d", second))").tag(second)
                    }
                }
            } label: {
                Text("\(String(format: "%02d", seconds))")
                    .frame(minWidth: 30)
                    .foregroundColor(.primary)
            }.disabled(isDisabled)

            Text("sec")
        }
        .onChange(of: hours) { updateDurationSeconds() }
        .onChange(of: minutes) { updateDurationSeconds() }
        .onChange(of: seconds) { updateDurationSeconds() }
        .onAppear {
            initializeHoursMinutesSeconds()
        }
    }
}
