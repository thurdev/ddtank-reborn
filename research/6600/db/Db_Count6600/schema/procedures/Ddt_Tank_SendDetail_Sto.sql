-- SQL_STORED_PROCEDURE dbo.Ddt_Tank_SendDetail_Sto (modified 2012-04-21T07:53:25.153)

CREATE  PROCEDURE [dbo].[Ddt_Tank_SendDetail_Sto]  
 @SendId int, 
 @GoodId int, 
 @GoodNumber int, 
 @GoodName varchar(50), 
 @TemplateID int, 
 @ValidDate int, 
 @Gold int, 
 @Money int, 
 @Lijuan int, 
 @StrengthenLevel int, 
 @AttackCompose int, 
 @DefendCompose int, 
 @AgilityCompose int, 
 @LuckCompose int, 
 @IsBind bit, 
 @IsSex int,  
 @op varchar(50), 
 @ouototal varchar(50)='' output AS
if( @op='Insert') 
   begin 
	 if( @GoodName='0') 
	begin 
		select @GoodName=name,@TemplateID=categoryid from db_tank..shop_goods where templateid=@GoodId
	end
     INSERT INTO Db_Count.dbo.Ddt_SendDetail(SendId, GoodId, GoodNumber, GoodName, TemplateID, ValidDate, Gold, Money,Lijuan, StrengthenLevel, AttackCompose, DefendCompose, AgilityCompose, LuckCompose, IsBind, IsSex) 
     VALUES(@SendId, @GoodId, @GoodNumber, @GoodName, @TemplateID, @ValidDate, @Gold, @Money, @Lijuan,@StrengthenLevel, @AttackCompose, @DefendCompose, @AgilityCompose, @LuckCompose, @IsBind, @IsSex)
     select @@identity as 'identity'
     set @ouototal=@@identity    
 end 
  
 if( @op!='Insert')
   begin 
     UPDATE Db_Count.dbo.Ddt_SendDetail Set SendId=@SendId, GoodId=@GoodId, GoodNumber=@GoodNumber, GoodName=@GoodName, TemplateID=@TemplateID, ValidDate=@ValidDate, Gold=@Gold, Money=@Money, Lijuan=@Lijuan,StrengthenLevel=@StrengthenLevel, AttackCompose=@AttackCompose, DefendCompose=@DefendCompose, AgilityCompose=@AgilityCompose, LuckCompose=@LuckCompose, IsBind=@IsBind, IsSex=@IsSex WHERE (id =@op)
     set @ouototal=@op   	
   end

GO
