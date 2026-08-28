SELECT 
    t.name AS TableName,
    SUM(p.rows) AS TotalRows,
    SUM(os.leaf_update_count) AS UpdatedRows,
    MAX(us.last_user_update) AS LastUpdated
FROM sys.tables t
JOIN sys.partitions p 
    ON t.object_id = p.object_id
    AND p.index_id IN (0,1)   -- clustered index or heap
LEFT JOIN sys.dm_db_index_usage_stats us 
    ON t.object_id = us.object_id
    AND us.database_id = DB_ID()
LEFT JOIN sys.dm_db_index_operational_stats(DB_ID(), NULL, NULL, NULL) os
    ON t.object_id = os.object_id
GROUP BY t.name
ORDER BY UpdatedRows DESC;
