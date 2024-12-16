//
//  ContentView.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//

import SwiftUI

struct EntityPage: View {
    @StateObject private var entity: EntityModel
    private let entityId: String
    
    init(entityId: String) {
        self.entityId = entityId;
        self._entity = StateObject(wrappedValue: EntityModel(entityId: entityId));
    }
    
    var body: some View {
        List {
            ForEach(entity.events, id: \._id) { event in
                NavigationLink(value: event) {
                    Text(event.date)
                }
            }
        }
        .navigationTitle(entity.entity.name)
        .navigationDestination(for: Event.self) { event in
            EditEntryPage(event: event)
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink(destination: EditEntryPage(entityId: self.entityId)) {
                    Text("Add")
                }
            }
        }
    }
}
