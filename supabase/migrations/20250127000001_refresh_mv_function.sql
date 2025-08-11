-- =====================================================
-- FUNCIÓN RPC PARA REFRESCAR VISTAS MATERIALIZADAS
-- =====================================================

-- Función para refrescar vistas materializadas de forma segura
CREATE OR REPLACE FUNCTION refresh_materialized_view(view_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    view_exists boolean;
    refresh_sql text;
BEGIN
    -- Verificar que la vista existe
    SELECT EXISTS (
        SELECT 1 FROM pg_matviews 
        WHERE matviewname = view_name
    ) INTO view_exists;
    
    IF NOT view_exists THEN
        RAISE EXCEPTION 'Materialized view % does not exist', view_name;
    END IF;
    
    -- Construir SQL de refresh
    refresh_sql := 'REFRESH MATERIALIZED VIEW CONCURRENTLY ' || quote_ident(view_name);
    
    -- Ejecutar refresh
    EXECUTE refresh_sql;
    
    RAISE NOTICE 'Successfully refreshed materialized view: %', view_name;
END;
$$;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION refresh_materialized_view(text) TO authenticated;

-- Comentario de la función
COMMENT ON FUNCTION refresh_materialized_view(text) IS 
'Refresca una vista materializada de forma segura. Solo permite refrescar vistas que existen.';
