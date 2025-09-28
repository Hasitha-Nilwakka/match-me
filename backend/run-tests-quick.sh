#!/bin/bash

# Quick test runner - runs only the failing tests to verify fixes
echo "🚀 Running quick test suite (failing tests only)..."
echo ""

# Initialize counters
total_tests=0
passed_tests=0
failed_tests=0

# Function to run a single test
run_test() {
    local test_name=$1
    total_tests=$((total_tests + 1))
    echo "🔄 [$total_tests/6] Running $test_name..."
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

# Run only the tests that were failing
run_test "TestGetChatMessages_Success"
run_test "TestSendMessage_Success"
run_test "TestMarkChatAsRead_Success"
run_test "TestDeleteChat_Success"
run_test "TestGetRecommendations_Success"
run_test "TestLikeRecommendation_Success"

echo ""
echo "🎉 Quick test suite completed!"
echo ""
echo "📊 Final Results:"
echo "Total Tests: $total_tests"
echo "Passed: $passed_tests ✅"
echo "Failed: $failed_tests ❌"
echo ""
echo "📈 Success Rate: $(( passed_tests * 100 / total_tests ))%"
echo ""
echo "💡 These are the tests that were failing due to database isolation issues."
echo "   If they pass now, the handlers are working correctly!"
