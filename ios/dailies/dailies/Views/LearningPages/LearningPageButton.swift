//
//  LearningPageButton.swift
//  dailies
//
//  Created by David Wetterau on 12/26/24.
//

import SwiftUI

struct LearningPageButton: View {
    @ObservedObject var entityListModel: EntityListModel

    var body: some View {
        BigButton(
            buttonText: "Learning",
            buttonCompleteColor: getColorForEntityCategory(.learning),
            completionRatio: entityListModel.getCategoryCompletionRatio(for: .learning)
        )
    }
}
