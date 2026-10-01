-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_ItemStrengthen (modified 2021-06-04T01:29:18.167)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_ItemStrengthen] 
		   @StrengthenLevel int,
           @Rock int,
           @Random int,
           @Rock1 int,
           @Rock2 int,
           @Rock3 int,
           @StoneLevelMin int,
           @setUpdate int
           
AS

declare @count2 int

select @count2 = isnull(count(*),0) from Item_Strengthen where [StrengthenLevel] = @StrengthenLevel
if (@count2 <> 0 and @setUpdate = 0)
begin
   UPDATE [dbo].[Item_Strengthen]
   SET [StrengthenLevel] = @StrengthenLevel
      ,[Rock] = @Rock
      ,[Random] = @Random
      ,[Rock1] = @Rock1
      ,[Rock2] = @Rock2
      ,[Rock3] = @Rock3
      ,[StoneLevelMin] = @StoneLevelMin
 WHERE [StrengthenLevel] = @StrengthenLevel
    
return 1  
end
--add Ball
else 
begin
INSERT INTO [dbo].[Item_Strengthen]
           ([StrengthenLevel]
           ,[Rock]
           ,[Random]
           ,[Rock1]
           ,[Rock2]
           ,[Rock3]
           ,[StoneLevelMin])
     VALUES
           (@StrengthenLevel,
           @Rock,
           @Random,
           @Rock1,
           @Rock2,
           @Rock3,
           @StoneLevelMin)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
