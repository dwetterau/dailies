//
//  ContentView.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//

import SwiftUI
import SwiftUIRouter

struct EntityListPage: View {
    @EnvironmentObject var navigator: Navigator
    @StateObject var viewModel = EntityListModel()
    
    var body: some View {
        VStack {
            Text("Entities").font(.title)
            List {
                ForEach(viewModel.entities.entities, id: \._id) { entity in
                    Text(entity.name).onTapGesture {
                        navigator.navigate("/entity/\(entity._id)")
                    }
                }
            }
        }
        .padding()
    }
}
