-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_Item_Strengthen_Goods (modified 2021-06-04T01:29:18.160)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_Item_Strengthen_Goods]	
			@Level int
           ,@CurrentEquip int
           ,@GainEquip int  
           ,@OrginEquip int                    
           ,@setUpdate int
           
AS
declare @count2 int

select @count2 = isnull(count(*),0) from [dbo].[Item_Strengthen_Goods] where [Level] = @Level and [CurrentEquip] = @CurrentEquip
if (@count2 <> 0 and @setUpdate = 0)
begin

UPDATE [dbo].[Item_Strengthen_Goods]
   SET [Level] = @Level
      ,[CurrentEquip] = @CurrentEquip
      ,[GainEquip] = @GainEquip
      ,[OrginEquip] = @OrginEquip
 WHERE [Level] = @Level and [CurrentEquip] = @CurrentEquip
 
return 1 
 end
else 
begin

INSERT INTO [dbo].[Item_Strengthen_Goods]
           ([Level]
           ,[CurrentEquip]
           ,[GainEquip]
           ,[OrginEquip])
     VALUES
           (@Level
           ,@CurrentEquip
           ,@GainEquip
           ,@OrginEquip)
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
