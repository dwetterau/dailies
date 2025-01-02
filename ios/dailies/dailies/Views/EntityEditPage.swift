//
//  EntityEditPage.swift
//  Dailies (dev)
//
//  Created by David Wetterau on 1/1/25.
//

import ConvexMobile
import SwiftUI

struct EntityEditPage: View {
    // If set, we are editing an existing entity
    @State private var entityId: String? = nil

    // Editable fields
    @State private var name: String = ""
    @State private var category: EntityCategory = .learning
    @State private var type: EntityType = .genericCompletion
    @State private var resetInterval: ResetInterval = .daily
    @State private var isRequired: Bool = false
    @State private var numRequiredCompletions: Int? = nil

    @Environment(\.dismiss) private var dismiss

    private let onSave: () -> Void

    init(
        onSave: @escaping () -> Void = {}
    ) {
        self.onSave = onSave
    }

    var body: some View {
        Group {
            Form {
                Section(header: Text("Name")) {
                    TextField("Entity...", text: $name)
                        .keyboardType(.default)
                }
                Section(header: Text("Category")) {
                    self.categoryMenu()
                }
                Section(header: Text("Type")) {
                    self.typeMenu()
                }
                Section(header: Text("Frequency")) {
                    self.isRequiredPicker()
                    self.resetIntervalMenu()
                    if requiresNumberOfCompletions() {
                        self.numRequiredCompletionsInput()
                    }
                }
            }
        }
        .navigationTitle("New entity")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: handleSubmit) {
                    Text("Save")
                        .fontWeight(.bold)
                }.disabled(isAnyFieldUnset())
            }
        }
    }

    @ViewBuilder
    func categoryMenu() -> some View {
        Menu {
            Picker("Category", selection: $category) {
                ForEach(EntityCategory.allCases, id: \.self) { category in
                    Text(category.displayName())
                }
            }
        } label: {
            Text("\(category.displayName())")
                .foregroundColor(.primary)
        }
    }

    @ViewBuilder
    func typeMenu() -> some View {
        Menu {
            Picker("Type", selection: $type) {
                ForEach(EntityType.allCases, id: \.self) { type in
                    Text(type.displayName())
                }
            }
        } label: {
            Text("\(type.displayName())")
        }
    }

    @ViewBuilder
    func resetIntervalMenu() -> some View {
        Menu {
            Picker("ResetInterval", selection: $resetInterval) {
                ForEach(ResetInterval.allCases, id: \.self) { type in
                    Text(type.displayName())
                }
            }
        } label: {
            Text("\(resetInterval.displayName())")
        }
    }

    @ViewBuilder
    func isRequiredPicker() -> some View {
        Picker("Is Required?", selection: $isRequired) {
            Text("Required").tag(true)
            Text("Optional").tag(false)
        }
        .pickerStyle(MenuPickerStyle())
    }

    @ViewBuilder
    func numRequiredCompletionsInput() -> some View {
        HStack {
            Text("# Completions")
            TextField("0", value: $numRequiredCompletions, format: .number)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.trailing)
        }
    }

    func isAnyFieldUnset() -> Bool {
        return name.isEmpty || (numRequiredCompletions == nil && requiresNumberOfCompletions())
    }

    func requiresNumberOfCompletions() -> Bool {
        return type != .workout
    }

    private func handleSubmit() {
        guard !isAnyFieldUnset() else {
            print("WARN: Not saving new entity, missing field")
            return
        }
        var newEntityArgs: [String: ConvexEncodable] = [
            "name": name,
            "category": category.rawValue,
        ]
        if requiresNumberOfCompletions() {
            newEntityArgs["numRequiredCompletions"] = numRequiredCompletions!
        }
        Task {
            do {
                if entityId == nil {
                    try await client.mutation("entities:create", with: newEntityArgs)
                } else {
                    newEntityArgs["id"] = entityId
                    try await client.mutation("entities:create", with: newEntityArgs)
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
    EntityEditPage()
}
