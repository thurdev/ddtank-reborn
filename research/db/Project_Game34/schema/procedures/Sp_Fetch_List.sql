-- SQL_STORED_PROCEDURE dbo.Sp_Fetch_List (modified 2021-06-04T01:29:17.967)



-- =============================================
-- Author:		小危
-- ALTER  date: 2009-06-18
-- Description:	分页存储过程
-- =============================================
CREATE  PROCEDURE [dbo].[Sp_Fetch_List](  
  @page_num                INT,
  @row_in_page             Bigint,
  @order_column            NVARCHAR(100),
  @row_total               Bigint  OUTPUT,
  @comb_condition          NVARCHAR(1000),
  @tablename      nvarchar(200)
)
AS
BEGIN

If( (dbo.FiltSql(@comb_condition)=0)or(dbo.FiltSql(@order_column)=0) or (dbo.FiltSql(@tablename)=0))
Begin
   Return
End

    SET NOCOUNT ON
    DECLARE 
      @jcc_status             INT,
      @sql                  NVARCHAR(4000),
      @row_ahead        INT
     
  SET @jcc_status = 0
  
  SET @row_ahead = (@page_num-1) * @row_in_page
SET @sql='SELECT TOP '+ cast(@row_in_page as Nvarchar(255)) +  ' * FROM ( '
SET @sql = @sql + 'SELECT   *
FROM  '+@tablename+'  
 ) as A where 1=1'
IF LEN(@comb_condition)>0
        SET @sql = @sql + ' AND (' + @comb_condition  + ')'    
SET @sql = @sql + 'and ID not in ( select ID from ('
SET @sql = @sql + 'SELECT TOP ' + cast(@row_ahead as Nvarchar(255)) + ' * From ('
SET @sql = @sql + 'SELECT   *
FROM '+@tablename+' 
 ) as A where 1=1'
    IF LEN(@comb_condition)>0
        SET @sql = @sql + ' AND ( ' + @comb_condition  + ' )'    
    IF LEN(@order_column)>0
        BEGIN
            SET @sql = @sql + ' ORDER BY ' + @order_column    + ' ) AS B )'
        END
    ELSE
        BEGIN
            SET @sql = @sql + ' ) AS B )'
        END
    IF LEN(@order_column)>0
        BEGIN
            SET @sql = @sql + ' ORDER BY ' + @order_column     
        END
 print @sql
    EXEC (@sql)
    SET @sql= N'SELECT @row_total=COUNT(*) FROM ('
SET @sql = @sql + 'SELECT  *
FROM '+@tablename+'
 ) as A where 1=1'
IF LEN(@comb_condition)>0
        SET @sql = @sql + ' AND (' + @comb_condition  + ')'    
print @sql
    EXEC sp_executesql @sql,N'@row_total INT OUT',@row_total OUT
    IF @@ERROR != 0
    BEGIN
        SELECT @jcc_status = -98
    END
exit_bk:
-- exit with MS SQL Server error
  IF @jcc_status = -98
    BEGIN
      RAISERROR ('MS SQL Server error, please contact your system administrator.',16,1)WITH NOWAIT
      RETURN (@jcc_status)
    END
-- normal exit 
  RETURN (0)
END







GO
