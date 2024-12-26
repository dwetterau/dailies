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
            if let hydrationEntityId = entityListModel.getEntityId(forCategory: .care, forType: .hydration) {
                HydrationButton(entityId: hydrationEntityId)
            }
            if let prescriptionsEntityId = entityListModel.getEntityId(forCategory: .care, forType: .prescriptions) {
                PrescriptionsButton(entityId: prescriptionsEntityId)
            }
        }.navigationTitle("Care")
    }
}
