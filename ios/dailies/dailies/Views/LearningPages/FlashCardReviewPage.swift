//
//  FlashCardReviewPage.swift
//  dailes dev
//
//  Created by David Wetterau on 12/22/24.
//

import AlertToast
import SwiftUI

struct FlashCardReviewPage: View {
    @StateObject var viewModel: FlashCardReviewModel

    @State var showSaveSuccessToast = false
    @State var showLoadSuccessToast = false

    init(_ entityId: String) {
        // TODO: Finish supporting weekly mode for flash card review
        _viewModel = StateObject(wrappedValue: FlashCardReviewModel(
            entityId,
            resetInterval: .daily
        ))
    }

    var body: some View {
        ZStack(alignment: .top) {
            VStack {
                if let card = viewModel.currentCard {
                    FlashCardView(card).padding(.top, 200)
                    Spacer().frame(idealHeight: 10, maxHeight: 10)
                    VStack(spacing: 10) {
                        HStack(spacing: 10) {
                            Button(action: {
                                viewModel
                                    .setCurrentCardReviewStatus("Easy")
                            }) {
                                Text("Easy")
                                    .frame(maxWidth: .infinity, minHeight: 60)
                                    .font(.title2)
                                    .background(.blue)
                                    .foregroundColor(.white)
                                    .cornerRadius(12)
                                    .padding(.leading, 30)
                                    .shadow(radius: 5)
                            }
                            .buttonStyle(ScaleButtonStyle())
                            Button(action: {
                                viewModel
                                    .setCurrentCardReviewStatus("Normal")
                            }) {
                                Text("Normal")
                                    .frame(maxWidth: .infinity, minHeight: 60)
                                    .font(.title2)
                                    .background(.green)
                                    .foregroundColor(.white)
                                    .cornerRadius(12)
                                    .padding(.trailing, 30)
                                    .shadow(radius: 5)
                            }
                            .buttonStyle(ScaleButtonStyle())
                        }
                        HStack(spacing: 10) {
                            Button(action: {
                                viewModel
                                    .setCurrentCardReviewStatus("Difficult")
                            }) {
                                Text("Difficult")
                                    .frame(maxWidth: .infinity, minHeight: 60)
                                    .font(.title2)
                                    .background(.purple)
                                    .foregroundColor(.white)
                                    .cornerRadius(12)
                                    .padding(.leading, 30)
                                    .shadow(radius: 5)
                            }
                            .buttonStyle(ScaleButtonStyle())
                            Button(action: {
                                viewModel
                                    .setCurrentCardReviewStatus("Wrong")
                            }) {
                                Text("Wrong")
                                    .frame(maxWidth: .infinity, minHeight: 60)
                                    .font(.title2)
                                    .background(.red)
                                    .foregroundColor(.white)
                                    .cornerRadius(12)
                                    .padding(.trailing, 30)
                                    .shadow(radius: 5)
                            }
                            .buttonStyle(ScaleButtonStyle())
                        }
                    }
                    .padding(.bottom, 200)
                }
            }
            Text(viewModel.getCardCountStats())
                .frame(maxWidth: .infinity, alignment: .topLeading)
                .padding()
            if let reviewStatsString = viewModel.getReviewStatsString() {
                Text(reviewStatsString).frame(maxWidth: .infinity, alignment: .topTrailing)
                    .padding()
            }
        }
        .navigationTitle("Flash Cards")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: {
                    viewModel.loadMoreFlashCards {
                        showLoadSuccessToast = true
                    }
                }) {
                    Text("Load").padding(.trailing, 5)
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: {
                    viewModel.saveReviewStatuses {
                        showSaveSuccessToast = true
                    }
                }) {
                    Text("Save")
                }.disabled(viewModel.isSaving)
            }
            if viewModel.shouldShowPreviousCardButton() {
                ToolbarItem(placement: .bottomBar) {
                    Button(action: {
                        viewModel.goToPreviousCard()
                    }) {
                        Text("Previous")
                    }
                }
            }
        }
        .toast(isPresenting: $showSaveSuccessToast) {
            AlertToast(type: .complete(.green), title: "Saved!")
        }
        .toast(isPresenting: $showLoadSuccessToast) {
            AlertToast(type: .complete(.green), title: "Loaded!")
        }
    }
}

struct PreviewContentWrapper: View {
    var body: some View {
        NavigationStack {
            List {
                NavigationLink("go", destination: FlashCardReviewPage(""))
            }
        }
    }
}

#Preview {
    NavigationStack {
        PreviewContentWrapper()
    }
}
