-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_Shop_Goods_Box (modified 2021-06-04T01:29:18.237)






-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_Shop_Goods_Box]
           @ID int,
           @TemplateId int,
           @IsSelect bit,
           @IsBind bit,
           @ItemValid int,
           @ItemCount int,
           @StrengthenLevel int,
           @AttackCompose int,
           @DefendCompose int,
           @AgilityCompose int,
           @LuckCompose int,
           @Random int,
           @IsTips int,
           @IsLogs bit,
           @setUpdate int
AS

declare @count int

select @count= isnull(count(*),0) from [Shop_Goods_Box] where [ID] = @ID and [TemplateId] = @TemplateId
if (@count = 0)-- and @setUpdate = 0)
begin
INSERT INTO [dbo].[Shop_Goods_Box]
           ([ID]
           ,[TemplateId]
           ,[IsSelect]
           ,[IsBind]
           ,[ItemValid]
           ,[ItemCount]
           ,[StrengthenLevel]
           ,[AttackCompose]
           ,[DefendCompose]
           ,[AgilityCompose]
           ,[LuckCompose]
           ,[Random]
           ,[IsTips]
           ,[IsLogs])
     VALUES
           (@ID,
           @TemplateId,
           0,
           @IsBind,
           @ItemValid,
           @ItemCount,
           @StrengthenLevel,
           @AttackCompose,
           @DefendCompose,
           @AgilityCompose,
           @LuckCompose,
           0,
           @IsTips,
           @IsLogs)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end










GO
