-- SQL_STORED_PROCEDURE dbo.Ddt_Active_Award_Sto (modified 2012-04-21T07:53:25.153)

CREATE  PROCEDURE  [dbo].[Ddt_Active_Award_Sto]  
 @ActiveID int, 
 @ItemID int, 
 @Count int, 
 @ValidDate int, 
 @StrengthenLevel int, 
 @AttackCompose int, 
 @DefendCompose int, 
 @LuckCompose int, 
 @AgilityCompose int, 
 @Gold int, 
 @Money int, 
 @Sex int, 
 @Mark int,  
 @op varchar(50), 
 @ouototal varchar(50)='' output AS  
 if( @op='Insert') 
   begin 
     INSERT INTO Db_Tank.Dbo.Active_Award(ActiveID, ItemID, Count, ValidDate, StrengthenLevel, AttackCompose, DefendCompose, LuckCompose, AgilityCompose, Gold, Money, Sex, Mark) 
     VALUES(@ActiveID, @ItemID, @Count, @ValidDate, @StrengthenLevel, @AttackCompose, @DefendCompose, @LuckCompose, @AgilityCompose, @Gold, @Money, @Sex, @Mark)
     select @@identity as 'identity'
     set @ouototal=@@identity    
 end 
  
 if( @op!='Insert')
   begin 
     UPDATE Db_Tank.Dbo.Active_Award Set ActiveID=@ActiveID, ItemID=@ItemID, Count=@Count, ValidDate=@ValidDate, StrengthenLevel=@StrengthenLevel, AttackCompose=@AttackCompose, DefendCompose=@DefendCompose, LuckCompose=@LuckCompose, AgilityCompose=@AgilityCompose, Gold=@Gold, Money=@Money, Sex=@Sex, Mark=@Mark WHERE (id =@op)
     set @ouototal=@op   	
   end


GO
