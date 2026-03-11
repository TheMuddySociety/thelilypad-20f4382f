// ── GraphQL Querying ─────────────────────────────────────────────────────

export interface QueryTag {
    name: string;
    values: string[];
}

export interface IrysQueryNode {
    id: string;
    address: string;
    receipt: {
        deadlineHeight: number;
        signature: string;
        timestamp: number;
        version: string;
    };
    tags: { name: string; value: string }[];
}

/**
 * Queries the Irys GraphQL endpoint by tags.
 * Default URL is devnet GraphQL.
 * 
 * @param tags The array of tags to filter on
 * @param limit Max number of results (default 1)
 * @param order "ASC" or "DESC" (default "DESC")
 * @returns Array of matching nodes with IDs and tags
 */
export async function queryIrysByTags(
    tags: QueryTag[],
    limit: number = 10,
    order: "ASC" | "DESC" = "DESC"
): Promise<{ node: IrysQueryNode }[]> {
    const endpoint = "https://devnet.irys.xyz/graphql";

    const tagFilters = tags.map(t => `{ name: "${t.name}", values: ${JSON.stringify(t.values)} }`).join(", ");

    const query = `
    query {
        transactions(
            tags: [${tagFilters}],
            limit: ${limit},
            order: ${order}
        ) {
            edges {
                node {
                    id
                    address
                    tags {
                        name
                        value
                    }
                    receipt {
                        deadlineHeight
                        signature
                        timestamp
                        version
                    }
                }
            }
        }
    }`;

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query })
        });

        if (!res.ok) {
            throw new Error(`GraphQL query failed: ${res.statusText}`);
        }

        const json = await res.json();
        return json.data?.transactions?.edges || [];
    } catch (error) {
        console.error("[Irys] GraphQL Error:", error);
        return [];
    }
}
