#!/usr/bin/env bash
set -euo pipefail
mkdir -p public/trends

images=(
"wix-managed-headless-default|https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&q=80&fm=jpg"
"shopify-hydrogen-remix-pressure|https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&q=80&fm=jpg"
"mcp-becomes-agent-integration-layer|https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=80&fm=jpg"
"remote-mcp-security-boundary|https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=80&fm=jpg"
"agentic-payments-trust-rails|https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&fm=jpg"
"bnpl-wallets-checkout-baseline|https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=80&fm=jpg"
"tax-compliance-realtime-checkout|https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80&fm=jpg"
"accounting-erp-automation|https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80&fm=jpg"
"developer-cli-ai-workflows|https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=1200&q=80&fm=jpg"
"agency-workspaces-rbac|https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80&fm=jpg"
"identity-consent-data-residency|https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1200&q=80&fm=jpg"
"edge-performance-core-web-vitals|https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80&fm=jpg"
"unified-inventory-oms|https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&q=80&fm=jpg"
"supplier-network-automation|https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1200&q=80&fm=jpg"
"geo-llmo-answer-engine-baseline|https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=1200&q=80&fm=jpg"
"marketplace-feed-syndication|https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=1200&q=80&fm=jpg"
"first-party-telemetry-server-side|https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&fm=jpg"
"ai-ready-data-warehouse|https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80&fm=jpg"
)

for entry in "${images[@]}"; do
  id="${entry%%|*}"; url="${entry#*|}"
  echo "↓ $id"
  curl -sSL "$url" -o "public/trends/${id}.jpg"
done
echo "✓ Done — ${#images[@]} images in public/trends/"
