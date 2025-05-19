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
    @State private var includedEventFields: [EventField] = []

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
                Section(header: Text("Options")) {
                    self.categoryMenu()
                    self.typeMenu()
                    self.isRequiredPicker()
                    self.resetIntervalMenu()
                    if requiresNumberOfCompletions() {
                        self.numRequiredCompletionsInput()
                    }
                }
                if requiresIncludedEventFields() {
                    self.includedEventFieldsSection()
                }
            }
        }
        .navigationTitle("New entity")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: handleSubmit) {
                    Text("Save")
                        .fontWeight(.bold)
                }.disabled(isNewEntityInvalid())
            }
        }
    }

    @ViewBuilder
    func categoryMenu() -> some View {
        Picker("Category", selection: $category) {
            ForEach(EntityCategory.allCases, id: \.self) { category in
                Text(category.displayName()).tag(category)
            }
        }.pickerStyle(MenuPickerStyle())
    }

    @ViewBuilder
    func typeMenu() -> some View {
        Picker("Type", selection: $type) {
            ForEach(EntityType.allCases, id: \.self) { type in
                Text(type.displayName()).tag(type)
            }
        }.pickerStyle(MenuPickerStyle())
    }

    @ViewBuilder
    func resetIntervalMenu() -> some View {
        Picker("Interval", selection: $resetInterval) {
            ForEach(ResetInterval.allCases, id: \.self) { type in
                Text(type.displayName()).tag(type)
            }
        }.pickerStyle(MenuPickerStyle())
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
            Text("Completions / Interval")
            TextField("0", value: $numRequiredCompletions, format: .number)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.trailing)
        }
    }

    @ViewBuilder
    func includedEventFieldsSection() -> some View {
        Section(header: Text("Event fields")) {
            List {
                ForEach(type.getSupportedEventFields(), id: \.self) { eventField in
                    HStack {
                        Text(eventField.displayName())
                        Spacer()
                        if includedEventFields.contains(eventField) {
                            Image(systemName: "checkmark")
                                .foregroundColor(.blue)
                        }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture {
                        self.toggleIncludedEventFieldSelection(for: eventField)
                    }
                }
            }
            .frame(maxHeight: 200)
            .cornerRadius(8)
        }
    }

    private func toggleIncludedEventFieldSelection(for field: EventField) {
        if let index = includedEventFields.firstIndex(of: field) {
            includedEventFields.remove(at: index)
        } else {
            includedEventFields.append(field)
        }
    }

    func isNewEntityInvalid() -> Bool {
        if name.isEmpty {
            return true
        }
        if numRequiredCompletions == nil && requiresNumberOfCompletions() {
            return true
        }
        if includedEventFields.isEmpty && requiresIncludedEventFields() {
            return true
        }

        // TODO: For now these rules are required by the pages that render them
        if type == .workout && category != .exercise {
            return true
        }
        if type == .flashCards && category != .learning {
            return true
        }

        return false
    }

    func requiresNumberOfCompletions() -> Bool {
        return type != .workout
    }

    func requiresIncludedEventFields() -> Bool {
        return type == .workout
    }

    private func handleSubmit() {
        guard !isNewEntityInvalid() else {
            print("WARN: Not saving new entity, missing field")
            return
        }
        var newEntityArgs: [String: ConvexEncodable] = [
            "name": name,
            "category": category.rawValue,
            "type": type.rawValue,
            "isRequired": isRequired,
            "resetAfterInterval": resetInterval.rawValue,
        ]
        if requiresNumberOfCompletions() {
            newEntityArgs["numRequiredCompletions"] = Float64(numRequiredCompletions!)
        }
        if requiresIncludedEventFields() {
            newEntityArgs["includedEventFields"] = includedEventFields.map { $0.rawValue }
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
            } catch {
                handleMutationError(error)
            }
        }
    }
}

#Preview {
    EntityEditPage()
}
