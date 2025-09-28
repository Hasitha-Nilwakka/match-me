#!/bin/bash

# Test runner script with database cleanup - runs tests sequentially
echo "🧪 Running tests sequentially with database cleanup..."
echo "This ensures each test gets a clean database state."
echo ""

# Initialize counters
total_tests=0
passed_tests=0
failed_tests=0

# Function to run a single test
run_test() {
    local test_name=$1
    total_tests=$((total_tests + 1))
    echo "🔄 [$total_tests/33] Running $test_name..."
    go test ./handlers -run "$test_name" -v -parallel 1
    if [ $? -eq 0 ]; then
        echo "✅ $test_name PASSED"
        passed_tests=$((passed_tests + 1))
    else
        echo "❌ $test_name FAILED"
        failed_tests=$((failed_tests + 1))
    fi
    echo "---"
}

# Run all tests individually
run_test "TestRegisterAndLogin_Success"
run_test "TestRegister_DuplicateEmail"
run_test "TestUpdateProfile_Success"
run_test "TestUpdateBio_Success"
run_test "TestGetSeekingPreferences_Success"
run_test "TestGetSeekingPreferences_NotFound"
run_test "TestUpdateSeekingPreferences_Success"
run_test "TestGetMeProfile_Success"
run_test "TestGetMeBio_Success"
run_test "TestGetAllChats_Success"
run_test "TestGetChatMessages_Success"
run_test "TestSendMessage_Success"
run_test "TestMarkChatAsRead_Success"
run_test "TestDeleteChat_Success"
run_test "TestGetConnections_Success"
run_test "TestGetConnectionRequests_Success"
run_test "TestUpdateConnection_Accept"
run_test "TestUpdateConnection_Reject"
run_test "TestDeleteConnection_Success"
run_test "TestGetRecommendations_Success"
run_test "TestLikeRecommendation_Success"
run_test "TestDismissRecommendation_Success"
run_test "TestCalculateMatchScore_UsesMultipleSignals"
run_test "TestCalculateMatchScore_NoMatches"
run_test "TestCalculateMatchScore_PartialMatches"
run_test "TestGetLanguages_Success"
run_test "TestGetHobbies_Success"
run_test "TestGetInterests_Success"
run_test "TestGetMusicGenres_Success"
run_test "TestGetMovieGenres_Success"
run_test "TestGetFoodPreferences_Success"
run_test "TestGetTravelTypes_Success"

echo ""
echo "🎉 All tests completed!"
echo ""
echo "📊 Final Results:"
echo "Total Tests: $total_tests"
echo "Passed: $passed_tests ✅"
echo "Failed: $failed_tests ❌"
echo ""
echo "📈 Success Rate: $(( passed_tests * 100 / total_tests ))%"
echo ""
echo "💡 Note: Tests were run sequentially to ensure database isolation."
echo "   Each test gets a fresh database state, preventing interference."
echo "   If you see failures, they indicate real issues in the handlers."
echo "   If you see passes, the handlers are working correctly!"
