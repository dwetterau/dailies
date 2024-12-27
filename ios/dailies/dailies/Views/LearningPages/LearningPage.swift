//
//  LearningPage.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//

import SwiftUI

struct LearningPage: View {
    @ObservedObject var entityListModel: EntityListModel

    var body: some View {
        VStack(spacing: 20) {
            if let flashCardsEntity = entityListModel.getEntity(forCategory: .learning, forType: .flashCards) {
                NavigationLink(value: "flashCards") {
                    BigButton(
                        buttonText: flashCardsEntity.name,
                        buttonCompleteColor: flashCardsEntity.buttonColor,
                        completionRatio: entityListModel.getCompletionRatio(for: flashCardsEntity.id)
                    )
                }
            }
            if let journalingEntity = entityListModel.getEntity(forCategory: .learning, forType: .journaling) {
                EntityCompletionButton(journalingEntity)
            }
            if let duolingoEntity = entityListModel.getEntity(forCategory: .learning, forType: .duolingo) {
                EntityCompletionButton(duolingoEntity)
            }
        }.navigationTitle("Learning")
    }
}
