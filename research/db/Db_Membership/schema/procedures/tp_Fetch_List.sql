-- SQL_STORED_PROCEDURE dbo.tp_Fetch_List (modified 2008-11-20T09:14:11.747)
CREATE PROCEDURE [dbo].[tp_Fetch_List](  
  @page_num                INT,
  @row_in_page             INT,
  @order_column            VARCHAR(50),
  @row_total               INT  OUTPUT,
  @comb_condition          VARCHAR(1000),
  @tablename      nvarchar(200)
)
AS
BEGIN
    SET NOCOUNT ON

    DECLARE 
      @jcc_status             INT,
      @sql                  NVARCHAR(4000),
      @row_ahead        INT
     
  SET @jcc_status = 0
  

  SET @row_ahead = (@page_num-1) * @row_in_page


SET @sql='SELECT TOP '+ cast(@row_in_page as varchar(255)) +  ' * FROM ( '
SET @sql = @sql + 'SELECT   *

FROM  '+@tablename+'  
 ) as A where 1=1'

IF LEN(@comb_condition)>0
        SET @sql = @sql + ' AND (' + @comb_condition  + ')'    

SET @sql = @sql + 'and ID not in ( select ID from ('
SET @sql = @sql + 'SELECT TOP ' + cast(@row_ahead as varchar(255)) + ' * From ('
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
