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
            if let flashCardsEntityId = entityListModel.getEntityId(forCategory: .learning, forType: .flashCards) {
                NavigationLink(value: "flashCards") {
                    BigButton(
                        buttonText: "Flash Cards",
                        buttonCompleteColor: .green,
                        isComplete: entityListModel.isEntityDoneToday(entityId: flashCardsEntityId)
                    )
                }
            }
            if let journalingEntityId = entityListModel.getEntityId(forCategory: .learning, forType: .journaling) {
                JournalingButton(entityId: journalingEntityId)
            }
            if let duolingoEntityId = entityListModel.getEntityId(forCategory: .learning, forType: .duolingo) {
                DuolingoButton(entityId: duolingoEntityId)
            }
        }.navigationTitle("Learning")
    }
}
