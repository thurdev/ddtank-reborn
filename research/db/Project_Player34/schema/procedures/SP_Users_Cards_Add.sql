-- SQL_STORED_PROCEDURE dbo.SP_Users_Cards_Add (modified 2021-06-04T05:18:36.060)







-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：用户新增一个物品>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Cards_Add]   
 @CardID int output, 
 @Count int
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
           ,@Level int
           ,@CardGP int
AS  
declare  @temp int
select @temp = count(*) from [Sys_Users_Card] where CardID=@CardID
if @temp=0 
 begin 
	INSERT INTO [dbo].[Sys_Users_Card]
           ([Count]
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
           ,[Level]
           ,[CardGP])
     VALUES
           (@Count
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
           ,@Level
           ,@CardGP)
     
     select @@identity as 'identity'
     set @CardID=@@identity    
 end










GO
