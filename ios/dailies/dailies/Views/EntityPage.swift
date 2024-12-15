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
    
    init(entityId id: String) {
        entityId = id;
        _entity = StateObject(wrappedValue: EntityModel(entityId: id));
    }
    
    var body: some View {
        VStack {
            Text(entity.entity.name).font(.title)
            List {
                ForEach(entity.events, id: \._id) { event in
                    Text(event.date)
                }
            }
        }
        .padding()
    }
}
