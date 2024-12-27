//
//  EntityCompletionButton.swift
//  dailies
//
//  Created by David Wetterau on 12/27/24.
//

import SwiftUI

struct EntityCompletionButton: View {
    @StateObject var completionViewModel: EntityCompletionModel
    @ObservedObject var entityViewModel: EntityViewModel
    @State var showResetConfirmationAlert = false

    init(_ entity: EntityViewModel) {
        entityViewModel = entity
        _completionViewModel = StateObject(wrappedValue: EntityCompletionModel(entity))
    }

    var body: some View {
        Button(action: {
            completionViewModel.logCompletion()
        }) {
            BigButton(
                buttonText: "\(entityViewModel.name)",
                buttonCompleteColor: entityViewModel.buttonColor,
                completionRatio: completionViewModel.completionRatio
            )
        }
        .disabled(completionViewModel.isComplete || completionViewModel.isSaving)
        .onTapGesture(count: 3) {
            showResetConfirmationAlert = true
        }
        .alert("Reset completions?", isPresented: $showResetConfirmationAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Reset", role: .destructive) {
                completionViewModel.removeAllCompletions {}
            }
        }
    }
}
