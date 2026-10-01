-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_ConsortiaLevel (modified 2021-06-04T01:29:18.127)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_ConsortiaLevel] 
		   @Level int,
           @Riches int,
           @Deduct int,
           @NeedGold int,
           @NeedItem int,
           @Reward int,
           @Count int,
           @StoreRiches int,
           @SmithRiches int,
           @ShopRiches int,
           @KickMax int,
           @BufferRiches int,
           @setUpdate int
           
AS

declare @count2 int

select @count2 = isnull(count(*),0) from Consortia_Level where [Level]= @Level
if (@count2 <> 0 and @setUpdate = 0)
begin
   UPDATE [dbo].[Consortia_Level]
   SET [Level]= @Level
      ,[Riches]= @Riches
      ,[Deduct]= @Deduct
      ,[NeedGold]= @NeedGold
      ,[NeedItem]= @NeedItem
      ,[Reward]= @Reward
      ,[Count]= @Count
      ,[StoreRiches]= @StoreRiches
      ,[SmithRiches]= @SmithRiches
      ,[ShopRiches]= @ShopRiches
      ,[KickMax]= @KickMax
      ,[BufferRiches]= @BufferRiches
 WHERE [Level]= @Level
    
return 1  
end
--add Ball
else 
begin
INSERT INTO [dbo].[Consortia_Level]
           ([Level]
           ,[Riches]
           ,[Deduct]
           ,[NeedGold]
           ,[NeedItem]
           ,[Reward]
           ,[Count]
           ,[StoreRiches]
           ,[SmithRiches]
           ,[ShopRiches]
           ,[KickMax]
           ,[BufferRiches])
     VALUES
           (@Level,
           @Riches,
           @Deduct,
           @NeedGold,
           @NeedItem,
           @Reward,
           @Count,
           @StoreRiches,
           @SmithRiches,
           @ShopRiches,
           @KickMax,
           @BufferRiches)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
