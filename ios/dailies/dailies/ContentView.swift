//
//  ContentView.swift
//  dailies
//
//  Created by David Wetterau on 12/1/24.
//

import SwiftUI

struct ContentView: View {
    @StateObject var viewModel = ViewModel()
    
    var body: some View {
        List {
            ForEach(viewModel.entities, id: \._id) { entity in
                Text(entity.name)
            }
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
