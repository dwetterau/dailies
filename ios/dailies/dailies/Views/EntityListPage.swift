//
//  EntityListPage.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//

import SwiftUI

struct EntityListPage: View {
    let entities: [Entity]

    init(entities: [Entity]) {
        self.entities = entities
    }

    var body: some View {
        List {
            ForEach(self.entities, id: \._id) { entity in
                NavigationLink(value: entity) {
                    Text(entity.name)
                }
            }
        }.navigationDestination(for: Entity.self) { entity in
            EntityPage(entity: entity)
        }.navigationTitle("Entities")
    }
}
