-- SQL_TABLE_VALUED_FUNCTION dbo.Split (modified 2020-12-11T10:28:11.100)
-- =============================================
-- Author:        <XiaoV>
-- Create date:   <2009/7/6>
-- Description:   <拆分字符串函数>
-- =============================================
CREATE FUNCTION [dbo].[Split]
(
 @SplitString  nvarchar(4000),
 @Separator varchar(2) = ','
)
RETURNS @SplitStringsTable TABLE
(
 [id] int identity(1,1),
 [value]  nvarchar(50)
)
AS
BEGIN
    DECLARE @CurrentIndex int;
    DECLARE @NextIndex int;
    DECLARE @ReturnText  nvarchar(4000);
    SELECT @CurrentIndex=1;
    WHILE(@CurrentIndex<=len(@SplitString)) 
    BEGIN
        SELECT @NextIndex=charindex(@Separator,@SplitString,@CurrentIndex);
        IF(@NextIndex=0 OR @NextIndex IS NULL)
            SELECT @NextIndex=len(@SplitString)+1;
        
        SELECT @ReturnText=substring(@SplitString,@CurrentIndex,@NextIndex-@CurrentIndex);

        INSERT INTO @SplitStringsTable([value])
        VALUES(@ReturnText);
        
        SELECT @CurrentIndex=@NextIndex+1;
    END
    RETURN;
END




GO
