//
//  EntityCompletionButton.swift
//  dailies
//
//  Created by David Wetterau on 12/27/24.
//

import SwiftUI

struct EntityCompletionButton: View {
    @ObservedObject var entityViewModel: EntityViewModel
    @State var showResetConfirmationAlert = false

    init(_ entity: EntityViewModel) {
        entityViewModel = entity
    }

    var body: some View {
        Button(action: {
            entityViewModel.completionModel.logCompletion()
        }) {
            BigButton(
                buttonText: "\(entityViewModel.name)",
                buttonCompleteColor: entityViewModel.buttonColor,
                completionRatio: entityViewModel.completionModel.completionRatio
            )
        }
        .buttonStyle(ScaleButtonStyle())
        .disabled(entityViewModel.completionModel.isComplete || entityViewModel.completionModel.isSaving)
        .onTapGesture(count: 3) {
            showResetConfirmationAlert = true
        }
        .alert("Reset completions?", isPresented: $showResetConfirmationAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Reset", role: .destructive) {
                entityViewModel.completionModel.removeAllCompletions {}
            }
        }
    }
}
