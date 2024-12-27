//
//  ExercisePageButton.swift
//  dailies
//
//  Created by David Wetterau on 12/27/24.
//

import SwiftUI

struct ExercisePageButton: View {
    @ObservedObject var entityListModel: EntityListModel

    var body: some View {
        BigButton(
            buttonText: "Exercise",
            buttonCompleteColor: getColorForEntityCategory(.exercise),
            completionRatio: entityListModel.getCategoryCompletionRatio(for: .exercise)
        )
    }
}
