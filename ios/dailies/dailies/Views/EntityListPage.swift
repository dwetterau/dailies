//
//  ContentView.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//

import SwiftUI

struct EntityListPage: View {
    @StateObject var viewModel = EntityListModel()
    
    var body: some View {
        VStack {
            List {
                ForEach(viewModel.entities.entities, id: \._id) { entity in
                    NavigationLink(value: entity) {
                        Text(entity.name)
                    }
                }
            }.navigationDestination(for: Entity.self) { entity in
                EntityPage(entityId: entity._id)
            }.navigationTitle("Entities")
        }
        .padding()
    }
}
