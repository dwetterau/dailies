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
        VStack {
            if let hydrationEntityId = entityListModel.getHydrationEntityId() {
                HydrationButton(entityId: hydrationEntityId)
            }
        }.navigationTitle("Care")
    }
}
