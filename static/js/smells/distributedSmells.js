/**
 * SchemaSense - Distributed Database & NoSQL Smells (Smells 28 - 33)
 * Evaluates sharding, hot partitions, document unbounded growth, replication, and CAP Theorem trade-offs.
 */

class DistributedSmellDetector {
    /**
     * Run all Distributed Database and NoSQL smell detectors
     * @param {Schema} schema 
     * @param {object} context 
     * @returns {SmellResult[]}
     */
    static detectAll(schema, context = {}) {
        const results = [];
        const defs = SMELL_DEFINITIONS.filter(d => d.category === SMELL_CATEGORIES.DISTRIBUTED);

        const d28 = defs.find(d => d.id === 'DIST-028');
        const d29 = defs.find(d => d.id === 'DIST-029');
        const d30 = defs.find(d => d.id === 'DIST-030');
        const d31 = defs.find(d => d.id === 'DIST-031');
        const d32 = defs.find(d => d.id === 'DIST-032');
        const d33 = defs.find(d => d.id === 'DIST-033');

        const opts = schema.advancedOptions || {};
        const isNoSqlOrDist = opts.noSqlModel && opts.noSqlModel !== 'none';

        // 28. Excessive Data Duplication in Distributed / NoSQL Design
        if (isNoSqlOrDist) {
            // Check if multiple tables/collections carry duplicate entity descriptors
            let duplicateAttributes = [];
            const colCounts = {};
            for (const table of schema.tables) {
                for (const col of table.columns) {
                    if (col.isPrimaryKey) continue;
                    const cLower = col.name.toLowerCase();
                    colCounts[cLower] = (colCounts[cLower] || 0) + 1;
                }
            }
            for (const [col, count] of Object.entries(colCounts)) {
                if (count >= 2 && !['created_at', 'updated_at', 'status'].includes(col)) {
                    duplicateAttributes.push(col);
                }
            }

            if (duplicateAttributes.length > 0) {
                results.push(new SmellResult({
                    smellDef: d28,
                    status: 'Potential / Needs Review',
                    severity: 'MEDIUM',
                    affectedObject: `NoSQL Collections: Duplicated fields (${duplicateAttributes.slice(0, 3).join(', ')})`,
                    whyDetected: `Educational Warning: In ${opts.noSqlModel.toUpperCase()} modeling, denormalization speeds up single-document reads, but duplicating attributes (${duplicateAttributes.slice(0, 3).join(', ')}) creates dual-write consistency overhead. When data updates occur, all embedded copies must be updated asynchronously, risking stale reads.`,
                    example: `Duplicated across collections: ${duplicateAttributes.slice(0, 3).join(', ')}`,
                    recommendation: `Embed only immutable or rarely changing fields (such as historical snapshot prices); reference frequently updated mutable entities.`
                }));
            }
        }

        // 29. Unbounded Document / Array
        for (const table of schema.tables) {
            for (const col of table.columns) {
                const lower = col.name.toLowerCase();
                const isUnboundedArray = ['comments', 'logs', 'audit_logs', 'events', 'messages', 'history', 'transactions'].includes(lower) ||
                                         (col.dataType.includes('JSON') && (lower.includes('list') || lower.includes('array')));
                
                if (isUnboundedArray) {
                    results.push(new SmellResult({
                        smellDef: d29,
                        status: 'Detected',
                        severity: 'HIGH',
                        affectedObject: `Attribute: ${table.name}.${col.name}`,
                        whyDetected: `Unbounded array pattern detected: '${col.name}' can grow indefinitely over time. In document databases (like MongoDB), this risks exceeding the 16MB maximum BSON document limit, causing severe fragmentation and performance cliffs.`,
                        example: `${table.name}.${col.name} (${col.dataType}) stores an unbounded sequence of events/comments`,
                        recommendation: `Use the Subset or Bucketing pattern: Store only the latest N items in the parent document, and move historical items into a dedicated collection with a parent foreign reference.`
                    }));
                }
            }
        }

        // 30. Poor Partition Key / Hot Partition Risk
        const partitionKey = opts.partitionKey ? opts.partitionKey.trim().toLowerCase() : '';
        const lowCardinalityKeys = ['status', 'gender', 'type', 'date', 'created_date', 'year', 'month', 'country', 'state', 'category', 'is_active'];

        if (partitionKey) {
            const isHotRisk = lowCardinalityKeys.some(k => partitionKey === k || partitionKey.endsWith('_' + k));
            if (isHotRisk) {
                results.push(new SmellResult({
                    smellDef: d30,
                    status: 'Detected',
                    severity: 'HIGH',
                    affectedObject: `Partition Key: ${partitionKey}`,
                    whyDetected: `High-Risk Hot Partition: The chosen partition key '${partitionKey}' has low cardinality or monotonic distribution. All writes and queries for a given value will bottleneck on a single physical shard node, causing severe imbalance while other nodes remain idle.`,
                    example: `SHARD KEY (${partitionKey})`,
                    recommendation: `Choose a high-cardinality shard key (e.g. user_id, device_uuid) or employ a compound hashed shard key (e.g. hash(${partitionKey}) + entity_id).`
                }));
            } else {
                results.push(new SmellResult({
                    smellDef: d30,
                    status: 'Not Detected',
                    severity: 'LOW',
                    affectedObject: `Partition Key: ${partitionKey}`,
                    whyDetected: `Partition key '${partitionKey}' exhibits acceptable cardinality properties for distributed sharding.`,
                    example: `SHARD KEY (${partitionKey})`,
                    recommendation: `Monitor partition chunk distribution across cluster shards over time.`
                }));
            }
        }

        // 31. Poor Fragmentation Strategy
        if (opts.fragmentationType && opts.fragmentationType !== 'none') {
            if (opts.fragmentationType === 'hybrid') {
                results.push(new SmellResult({
                    smellDef: d31,
                    status: 'Potential / Needs Review',
                    severity: 'MEDIUM',
                    affectedObject: `Fragmentation: ${opts.fragmentationType.toUpperCase()}`,
                    whyDetected: `Hybrid (horizontal + vertical) fragmentation introduces complex two-phase reconstruction overhead for queries. Reconstruction requires distributed joins across vertical fragments followed by unions across horizontal fragments.`,
                    example: `Hybrid fragmentation specified on relation`,
                    recommendation: `Evaluate whether pure horizontal fragmentation by geographic branch or tenant ID satisfies query locality without vertical splitting complexity.`
                }));
            }
        }

        // 32. Excessive Replication Factor
        const replFactor = parseInt(opts.replicationFactor) || 1;
        if (replFactor > 3) {
            results.push(new SmellResult({
                smellDef: d32,
                status: 'Potential / Needs Review',
                severity: 'LOW',
                affectedObject: `Replication Factor: ${replFactor}`,
                whyDetected: `Replication factor of ${replFactor} exceeds standard distributed best practices (typically N=3). While fault tolerance increases, write quorum synchronization latency (W > N/2) and storage footprint increase substantially.`,
                example: `Replication Factor: ${replFactor} nodes per replica set`,
                recommendation: `Evaluate if N=3 with multi-AZ quorum placement provides sufficient availability without write latency degradation.`
            }));
        }

        // 33. CAP / Consistency Requirement Mismatch
        const cap = opts.capPriorities || {};
        if (cap.c && cap.a && cap.p) {
            results.push(new SmellResult({
                smellDef: d33,
                status: 'Detected',
                severity: 'HIGH',
                affectedObject: `Architecture: CAP Requirements (Consistency + Availability + Partition Tolerance)`,
                whyDetected: `CAP Theorem Infeasibility: You have selected High Consistency (C), High Availability (A), and Partition Tolerance (P) simultaneously. Eric Brewer's CAP theorem mathematically proves that in any distributed network susceptible to network partitions (P), a database can guarantee at most Consistency (CP) OR Availability (AP), never all three simultaneously.`,
                example: `Selected Requirements: C = Yes, A = Yes, P = Yes`,
                recommendation: `Decide your partition tradeoff: choose CP (e.g. CockroachDB, Spanner, MongoDB with majority write concern) or AP (e.g. Cassandra, DynamoDB with eventual consistency).`
            }));
        } else if (cap.c && opts.noSqlModel === 'key-value') {
            results.push(new SmellResult({
                smellDef: d33,
                status: 'Potential / Needs Review',
                severity: 'MEDIUM',
                affectedObject: `Architecture: High Consistency with Key-Value NoSQL`,
                whyDetected: `Educational Warning: Key-Value stores (like DynamoDB or Riak) default to BASE (Basically Available, Soft state, Eventual consistency). If your application strictly requires serializable ACID transactions, you must configure strong read/write quorums (R + W > N) or use a CP distributed relational engine.`,
                example: `High Consistency requirement paired with Key-Value storage`,
                recommendation: `Enforce linearizable reads with Paxos/Raft consensus or select a relational distributed database.`
            }));
        }

        return results;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DistributedSmellDetector };
}
