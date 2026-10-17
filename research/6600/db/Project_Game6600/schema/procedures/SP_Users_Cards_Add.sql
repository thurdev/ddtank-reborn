-- SQL_STORED_PROCEDURE dbo.SP_Users_Cards_Add (modified 2015-01-25T14:04:48.277)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：用户新增一个物品>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Cards_Add]   
 @CardID int output, 
 @CardType int
           ,@UserID int
           ,@Place int
           ,@TemplateID int
           ,@isFirstGet bit
           ,@Attack int
           ,@Defence int
           ,@Luck int
           ,@Agility int
           ,@Damage int
           ,@Guard int
           ,@IsExit bit
           ,@Level int
           ,@CardGP int
           ,@Type int
AS  
declare  @temp int
select @temp = count(*) from [Sys_Users_Card] where CardID=@CardID
if @temp=0 
 begin 
	INSERT INTO [dbo].[Sys_Users_Card]
           ([CardType]
           ,[UserID]
           ,[Place]
           ,[TemplateID]
           ,[isFirstGet]
           ,[Attack]
           ,[Defence]
           ,[Luck]
           ,[Agility]
           ,[Damage]
           ,[Guard]
           ,[IsExit]
           ,[Level]
           ,[CardGP]
           ,[Type])
     VALUES
           (@CardType
           ,@UserID
           ,@Place
           ,@TemplateID
           ,@isFirstGet
           ,@Attack
           ,@Defence
           ,@Luck
           ,@Agility
           ,@Damage
           ,@Guard
           ,@IsExit
           ,@Level
           ,@CardGP
           ,@Type)
     
     select @@identity as 'identity'
     set @CardID=@@identity    
 end

GO
