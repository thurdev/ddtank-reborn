-- SQL_TABLE_VALUED_FUNCTION dbo.Split (modified 2009-11-19T17:47:20.170)
-- =============================================
-- Description:   <拆分字符串函数>
-- =============================================
CREATE FUNCTION [dbo].[Split]
(
 @SplitString nvarchar(2000), -- 如果要传入NText类型，下面需要相应的修改，注释行为NText下同
 @Separator varchar(2) -- NVarChar(2) = N','
)
RETURNS @SplitStringsTable TABLE
(
 [id] int identity(1,1),
 [value] varchar(8000) -- NVarChar(4000)
)
AS
BEGIN
    DECLARE @CurrentIndex int;
    DECLARE @NextIndex int;
    DECLARE @ReturnText varchar(8000);-- NVarChar(4000)
    SELECT @CurrentIndex=1;
    WHILE(@CurrentIndex<=datalength(@SplitString)) -- DATALENGTH(@SplitString)/2
    BEGIN
        SELECT @NextIndex=charindex(@Separator,@SplitString,@CurrentIndex);
        IF(@NextIndex=0 OR @NextIndex IS NULL)
            SELECT @NextIndex=datalength(@SplitString)+1;--DATALENGTH(@SplitString)/2
        
        SELECT @ReturnText=substring(@SplitString,@CurrentIndex,@NextIndex-@CurrentIndex);

        INSERT INTO @SplitStringsTable([value])
        VALUES(@ReturnText);
        
        SELECT @CurrentIndex=@NextIndex+1;
    END
    RETURN;
END

GO
