//
//  CarePage.swift
//  dailies
//
//  Created by David Wetterau on 12/25/24.
//

import SwiftUI

struct CarePage: View {
    @ObservedObject var entityListModel: EntityListModel

    var body: some View {
        VStack(spacing: 20) {
            if let hydrationEntity = entityListModel.getEntity(forCategory: .care, forType: .hydration) {
                EntityCompletionButton(hydrationEntity)
            }
            if let prescriptionsEntity = entityListModel.getEntity(forCategory: .care, forType: .prescriptions) {
                EntityCompletionButton(prescriptionsEntity)
            }
        }.navigationTitle("Care")
    }
}
