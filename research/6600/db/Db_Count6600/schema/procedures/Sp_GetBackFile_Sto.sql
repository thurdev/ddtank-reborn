-- SQL_STORED_PROCEDURE dbo.Sp_GetBackFile_Sto (modified 2012-04-21T07:53:24.670)

--描述：获取指定目录下的数据库备份文件
CREATE   PROC  Sp_GetBackFile_Sto
@Path Varchar(800)
AS 

Set @Path=Replace(@Path,'\\','\')
DECLARE @ExecSql VARCHAR(4000)

/*得到文件信息*/ 
CREATE TABLE #Temp_List(Files varchar(200))
DELETE FROM #Temp_List
SET  @ExecSql='master..xp_cmdshell   ''dir/B   '+@Path+''''       
PRINT @ExecSql
INSERT INTO #Temp_List EXEC (@ExecSql)


/*得到文件详细信息*/
CREATE TABLE #Temp_Detail(Detail varchar(4000))
DELETE FROM #Temp_Detail
SET  @ExecSql='master..xp_cmdshell   ''dir   '+@Path+''''
INSERT	INTO #Temp_Detail EXEC (@ExecSql)
/*文件关联*/
select * from ddt_GetBackFile_View
Union all
SELECT A.Files,REPLACE(B.Detail,A.Files,' ')AS Detail FROM #Temp_List A ,#Temp_Detail B
      WHERE   Files LIKE '%.%'  and CHARINDEX(A.Files,B.Detail)>0

      
/*清除临时表*/
DROP TABLE  #Temp_List
DROP TABLE  #Temp_Detail


GO
