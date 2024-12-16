//
//  EditEntryPag.swift
//  dailies
//
//  Created by David Wetterau on 12/15/24.
//

import SwiftUI
import ConvexMobile

struct EditEntryPage: View {
    @State private var date: Date = Date()
    @State private var weight: Double? = nil
    @State private var numReps: Int? = nil
    @State private var numSets: Int? = nil
    
    @Environment(\.dismiss) private var dismiss
   
    private let entityId: String
    
    init(entityId: String) {
        self.entityId = entityId
    }
    
    var body: some View {
        Form {
            Section(header: Text("Section header?")) {
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
                }.disabled(weight == nil || numReps == nil || numSets == nil)
            }
        }
    }
    
    private func handleSubmit() {
        guard weight != nil, numReps != nil, numSets != nil else {
            // TODO: show some warning message about them being required?
            return
        }
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        Task {
            do {
                try await client.mutation("events:create", with: [
                    "entityId": entityId,
                    "date": isoFormatter.string(from: date),
                    "details": EventType.workout(
                        WorkoutDetails(weight: weight!, numReps: numReps!, numSets: numSets!, overrides: nil)
                    ),
                ])
            } catch ClientError.ConvexError(let data) {
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
