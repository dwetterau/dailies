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
    @Binding var weight: Double?
    @Binding var numReps: Int?
    @Binding var numSets: Int?
    @Binding var durationSeconds: Double?
    @Binding var distance: Double?
    let isDisabled: Bool
    let isFieldRequired: (_: EventField) -> Bool

    @State private var hours: Int = 0
    @State private var minutes: Int = 0
    @State private var seconds: Int = 0
    @State private var isInitialized: Bool = false

    @State private var isShowingHoursPicker = false
    @State private var isShowingMinutesPicker = false
    @State private var isShowingSecondsPicker = false

    private func initializeHoursMinutesSeconds() {
        if isInitialized {
            return
        }
        isInitialized = true
        if let durationSeconds = durationSeconds {
            let (hours, minutes, seconds) = getHoursMinutesSeconds(forDurationSeconds: durationSeconds)
            self.hours = hours
            self.minutes = minutes
            self.seconds = seconds
        }
    }

    private func updateDurationSeconds() {
        durationSeconds = getDurationSeconds(forHoursMinutesSeconds: (hours, minutes, seconds))
    }

    var body: some View {
        if isFieldRequired(.weight) {
            HStack {
                Text(EventField.weight.displayName())
                TextField("0", value: $weight, format: .number)
                    .keyboardType(.decimalPad)
                    .disabled(isDisabled)
                    .multilineTextAlignment(.trailing)
                Text("lbs").foregroundColor(.gray)
            }
        }
        if isFieldRequired(.numReps) {
            HStack {
                Text(EventField.numReps.displayName())
                TextField("0", value: $numReps, format: .number)
                    .keyboardType(.numberPad)
                    .disabled(isDisabled)
                    .multilineTextAlignment(.trailing)
            }
        }
        if isFieldRequired(.numSets) {
            HStack {
                Text(EventField.numSets.displayName())
                TextField("0", value: $numSets, format: .number)
                    .keyboardType(.numberPad)
                    .disabled(isDisabled)
                    .multilineTextAlignment(.trailing)
            }
        }
        if isFieldRequired(.distance) {
            HStack {
                Text(EventField.distance.displayName())
                TextField("0", value: $distance, format: .number)
                    .keyboardType(.decimalPad)
                    .disabled(isDisabled)
                    .multilineTextAlignment(.trailing)
                Text("mi").foregroundColor(.gray)
            }
        }
        if isFieldRequired(.durationSeconds) {
            durationPicker()
        }
    }

    @ViewBuilder
    func durationPicker() -> some View {
        HStack {
            Text(EventField.durationSeconds.displayName())
            Spacer()

            Button {
                isShowingHoursPicker = true
            } label: {
                Text("\(hours)")
                    .frame(minWidth: 15)
                    .foregroundColor(.primary)
                    .contentShape(Rectangle())
            }
            .disabled(isDisabled)
            .buttonStyle(.borderless)
            .sheet(isPresented: $isShowingHoursPicker) {
                NavigationView {
                    Picker("Hours", selection: $hours) {
                        ForEach(0 ..< 24) { hour in
                            Text("\(hour)").tag(hour)
                        }
                    }
                    .pickerStyle(.wheel)
                    .navigationTitle("Hours")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button("Done") {
                                isShowingHoursPicker = false
                            }
                        }
                    }
                }
                .presentationDetents([.height(250)])
            }
            Text("hr").foregroundColor(.gray)

            Button {
                isShowingMinutesPicker = true
            } label: {
                Text("\(minutes)")
                    .frame(minWidth: 15)
                    .foregroundColor(.primary)
                    .contentShape(Rectangle())
            }
            .disabled(isDisabled)
            .buttonStyle(.borderless)
            .sheet(isPresented: $isShowingMinutesPicker) {
                NavigationView {
                    Picker("Minutes", selection: $minutes) {
                        ForEach(0 ..< 60) { minute in
                            Text("\(minute)").tag(minute)
                        }
                    }
                    .pickerStyle(.wheel)
                    .navigationTitle("Minutes")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button("Done") {
                                isShowingMinutesPicker = false
                            }
                        }
                    }
                }
                .presentationDetents([.height(250)])
            }

            Text("min").foregroundColor(.gray)

            Button {
                isShowingSecondsPicker = true
            } label: {
                Text("\(String(format: "%02d", seconds))")
                    .frame(minWidth: 30)
                    .foregroundColor(.primary)
                    .contentShape(Rectangle())
            }
            .disabled(isDisabled)
            .buttonStyle(.borderless)
            .sheet(isPresented: $isShowingSecondsPicker) {
                NavigationView {
                    Picker("Seconds", selection: $seconds) {
                        ForEach(0 ..< 60) { second in
                            Text("\(String(format: "%02d", second))").tag(second)
                        }
                    }
                    .pickerStyle(.wheel)
                    .navigationTitle("Seconds")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button("Done") {
                                isShowingSecondsPicker = false
                            }
                        }
                    }
                }
                .presentationDetents([.height(250)])
            }

            Text("sec").foregroundColor(.gray)
        }
        .onChange(of: hours) { updateDurationSeconds() }
        .onChange(of: minutes) { updateDurationSeconds() }
        .onChange(of: seconds) { updateDurationSeconds() }
        .onAppear {
            initializeHoursMinutesSeconds()
        }
    }
}
