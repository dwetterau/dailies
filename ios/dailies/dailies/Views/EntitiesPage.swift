//
//  ContentView.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//

import SwiftUI

struct EntitiesPage: View {
    @StateObject var viewModel = EntityModel()
    
    var body: some View {
        VStack {
            Text("Entities").font(.title)
            List {
                ForEach(viewModel.entities.entities, id: \._id) { entity in
                    Text(entity.name)
                }
            }
        }
        .padding()
    }
}
