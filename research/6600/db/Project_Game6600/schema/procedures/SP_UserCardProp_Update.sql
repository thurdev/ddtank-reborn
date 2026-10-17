-- SQL_STORED_PROCEDURE dbo.SP_UserCardProp_Update (modified 2015-01-25T14:04:48.247)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：用户发布一个商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UserCardProp_Update] 
@CardType int, 
@UserID int,
@Place int,
@TemplateID int ,
@isFirstGet bit,
@Attack int ,
@Defence int ,	
@Luck int ,
@Agility int ,
@Damage int ,
@Guard int,
@IsExit bit,
@Level int,
@CardGP int,
@Type int,
@CardID int
AS  
UPDATE [dbo].[Sys_Users_Card]
   SET [CardType] = @CardType
      ,[UserID] = @UserID
      ,[Place] = @Place
      ,[TemplateID] = @TemplateID
      ,[isFirstGet] = @isFirstGet
      ,[Attack] = @Attack
      ,[Defence] = @Defence
      ,[Luck] = @Luck
      ,[Agility] = @Agility
      ,[Damage] = @Damage
      ,[Guard] = @Guard
      ,[IsExit] = @IsExit
      ,[Level] = @Level
      ,[CardGP] = @CardGP
      ,[Type] = @Type
 WHERE [CardID] =@CardID --TemplateID = @TemplateID and [UserID] =@UserID
     --select @@identity as 'identity'
     --set @ID=@@identity

GO
