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
    
    var completionViewModel: EntityCompletionModel {
        entityViewModel.completionModel
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
        .buttonStyle(ScaleButtonStyle())
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
