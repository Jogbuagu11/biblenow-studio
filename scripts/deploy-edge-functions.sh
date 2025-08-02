#!/bin/bash

# Deploy edge functions to Supabase
echo "Deploying edge functions..."

# Deploy shield-user function
echo "Deploying shield-user function..."
npx supabase functions deploy shield-user --project-ref $(npx supabase status --output json | jq -r '.project_ref')

# Deploy unshield-user function
echo "Deploying unshield-user function..."
npx supabase functions deploy unshield-user --project-ref $(npx supabase status --output json | jq -r '.project_ref')

echo "Edge functions deployed successfully!" 