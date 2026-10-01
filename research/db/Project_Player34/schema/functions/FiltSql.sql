-- SQL_SCALAR_FUNCTION dbo.FiltSql (modified 2021-05-23T02:41:31.983)



CREATE   FUNCTION [dbo].[FiltSql] (@FiltSql Varchar(1000))  
RETURNS int  AS  
BEGIN 
Declare @result int

Declare @f1 varchar(20)
Declare @f2 varchar(20)
Declare @f3 varchar(20)
Declare @f4 varchar(20)
Declare @f5 varchar(20)
Declare @f6 varchar(20)
Declare @f7 varchar(20)
 
Set @f1='update '
Set @f2='insert '
Set @f3='table '
Set @f4='delete '
Set @f5='drop '
Set @f6='exec '
Set @f7='select '


SET @result=1
IF((charindex(@f1,@FiltSql,1)>0) OR (charindex(@f2,@FiltSql,1)>0) OR (charindex(@f3,@FiltSql,1)>0) OR (charindex(@f4,@FiltSql,1)>0) OR (charindex(@f5,@FiltSql,1)>0) OR  (charindex(@f6,@FiltSql,1)>0) OR (charindex(@f7,@FiltSql,1)>0))
begin
  Set @result=0 
end

Return @result
END







GO
